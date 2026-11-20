"""
CuraBook — Prescriptions Views
================================
GET  /api/v1/prescriptions/            → patient: own prescriptions | doctor: written by them
POST /api/v1/prescriptions/            → doctor creates prescription
GET  /api/v1/prescriptions/{id}/       → detail (patient or writing doctor only)
PUT  /api/v1/prescriptions/{id}/       → doctor updates (DRAFT only)
POST /api/v1/prescriptions/{id}/send/  → doctor sends to patient (DRAFT → SENT)
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Prescription
from .serializers import PrescriptionSerializer
from core.pagination import StandardPagination
from notifications.services import send_notification


class PrescriptionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/prescriptions/  — role-scoped list
    POST /api/v1/prescriptions/  — doctor creates
    """
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user

        if getattr(user, "is_doctor", False):
            return (
                Prescription.objects
                .filter(doctor=user)
                .select_related("patient", "doctor", "appointment")
                .prefetch_related("medications")
                .order_by("-created_at")
            )

        if getattr(user, "is_patient", False):
            return (
                Prescription.objects
                .filter(patient=user, status=Prescription.Status.SENT)
                .select_related("patient", "doctor", "appointment")
                .prefetch_related("medications")
                .order_by("-created_at")
            )

        if getattr(user, "is_platform_admin", False) or user.is_staff:
            return (
                Prescription.objects
                .all()
                .select_related("patient", "doctor", "appointment")
                .prefetch_related("medications")
                .order_by("-created_at")
            )

        return Prescription.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, "is_doctor", False):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only doctors can create prescriptions.")

        appointment = serializer.validated_data.get("appointment")
        if appointment:
            from appointments.models import Appointment
            # FIX: Allow prescriptions for both COMPLETED and CONFIRMED appointments
            # Previously only COMPLETED was allowed, blocking doctors from writing
            # prescriptions during active (confirmed) appointments.
            allowed_statuses = [Appointment.Status.COMPLETED, Appointment.Status.CONFIRMED]
            if appointment.status not in allowed_statuses:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    "Prescription can only be created for confirmed or completed appointments."
                )
            patient = appointment.patient
        else:
            patient_id = self.request.data.get("patient")
            from django.contrib.auth import get_user_model
            User = get_user_model()
            patient = get_object_or_404(User, id=patient_id, is_patient=True)

        serializer.save(doctor=user, patient=patient)


class PrescriptionDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/prescriptions/{id}/  — patient or doctor
    PUT   /api/v1/prescriptions/{id}/  — doctor only, DRAFT status only
    PATCH /api/v1/prescriptions/{id}/
    """
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        user   = self.request.user
        obj_id = self.kwargs.get("pk")
        obj = get_object_or_404(
            Prescription.objects.select_related("doctor", "patient").prefetch_related("medications"),
            pk=obj_id,
        )
        # Only the writing doctor or the patient can access
        if obj.doctor_id != user.id and obj.patient_id != user.id:
            if not (getattr(user, "is_platform_admin", False) or user.is_staff):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have access to this prescription.")
        return obj

    def update(self, request, *args, **kwargs):
        prescription = self.get_object()
        if prescription.doctor_id != request.user.id:
            return Response(
                {"detail": "Only the prescribing doctor can edit this prescription."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if prescription.status != Prescription.Status.DRAFT:
            return Response(
                {"detail": "Cannot edit a prescription that has already been sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)


class PrescriptionSendView(APIView):
    """
    POST /api/v1/prescriptions/{id}/send/
    Doctor sends the prescription to the patient — status: DRAFT → SENT.
    Patient receives an in-app notification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        prescription = get_object_or_404(
            Prescription.objects.select_related("doctor", "patient"),
            pk=pk,
        )

        if prescription.doctor_id != request.user.id:
            return Response(
                {"detail": "Only the prescribing doctor can send this prescription."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if prescription.status == Prescription.Status.SENT:
            return Response(
                {"detail": "This prescription has already been sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescription.status  = Prescription.Status.SENT
        prescription.sent_at = timezone.now()
        prescription.save(update_fields=["status", "sent_at"])

        # Notify patient
        send_notification(
            prescription.patient,
            title="New Prescription",
            body=(
                f"You have a new prescription from Dr. "
                f"{prescription.doctor.full_name or prescription.doctor.username}."
            ),
        )

        return Response(
            PrescriptionSerializer(prescription).data,
            status=status.HTTP_200_OK,
        )


class PrescriptionPDFView(APIView):
    """
    GET /api/v1/prescriptions/{id}/pdf/

    API-H07 FIX: Generate and return a PDF of the prescription.

    Access rules:
      - Doctor who wrote it  → always accessible
      - Patient it belongs to → only when status = SENT
      - Platform admin / staff → always accessible

    Implementation note:
      Uses Django's HttpResponse with content_type='application/pdf'.
      Generates PDF via html.escape-safe HTML string rendered with
      WeasyPrint (if available) or falls back to a plain-text PDF
      built with reportlab — both are in requirements.txt.
      The HTML template mirrors the printed prescription format used
      in Egyptian clinics (logo, doctor info, Rx grid, footer).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        from django.http import HttpResponse
        from .models import PrescriptionMedication

        user         = request.user
        prescription = get_object_or_404(
            Prescription.objects
            .select_related("doctor", "patient", "appointment")
            .prefetch_related("medications"),
            pk=pk,
        )

        # ── Permission check ──────────────────────────────────────────────
        is_doctor  = prescription.doctor_id == user.id
        is_patient = (
            prescription.patient_id == user.id
            and prescription.status == Prescription.Status.SENT
        )
        is_admin   = getattr(user, "is_platform_admin", False) or user.is_staff

        if not (is_doctor or is_patient or is_admin):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have access to this prescription.")

        # ── Build PDF ─────────────────────────────────────────────────────
        pdf_bytes = _render_prescription_pdf(prescription)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="prescription_{prescription.id}.pdf"'
        )
        return response


# ─────────────────────────────────────────────────────────────────────────────
# PDF rendering helpers
# ─────────────────────────────────────────────────────────────────────────────

def _render_prescription_pdf(prescription) -> bytes:
    """
    Returns PDF bytes for the given Prescription instance.
    Tries WeasyPrint first (best quality), falls back to ReportLab.
    """
    try:
        return _pdf_via_weasyprint(prescription)
    except Exception:
        pass
    try:
        return _pdf_via_reportlab(prescription)
    except Exception as exc:
        raise RuntimeError(f"PDF generation failed: {exc}") from exc


def _build_html(prescription) -> str:
    """Build a clean, printable HTML string for the prescription."""
    import html as h

    doctor_name  = h.escape(prescription.doctor.full_name or prescription.doctor.username)
    patient_name = h.escape(prescription.patient.full_name or prescription.patient.username)
    diagnosis    = h.escape(prescription.diagnosis or "")
    notes        = h.escape(prescription.notes or "")
    date_str     = prescription.created_at.strftime("%Y-%m-%d")

    rows = ""
    for i, med in enumerate(prescription.medications.all(), 1):
        rows += f"""
        <tr>
          <td>{i}</td>
          <td>{h.escape(med.name)}</td>
          <td>{h.escape(med.dosage or "")}</td>
          <td>{h.escape(med.frequency or "")}</td>
          <td>{h.escape(med.duration or "")}</td>
          <td>{h.escape(med.notes or "")}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 13px; color: #1a1a2e; padding: 32px; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start;
             border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }}
  .brand {{ font-size: 26px; font-weight: 800; color: #2563eb; }}
  .brand span {{ color: #1a1a2e; }}
  .meta {{ text-align: right; font-size: 11px; color: #6b7280; }}
  .section {{ margin-bottom: 20px; }}
  .section-title {{ font-size: 11px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px; }}
  .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
  .info-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
               padding: 12px 16px; }}
  .info-box .label {{ font-size: 10px; color: #94a3b8; font-weight: 600; }}
  .info-box .value {{ font-size: 14px; font-weight: 700; color: #1a1a2e; margin-top: 2px; }}
  .rx-symbol {{ font-size: 36px; font-weight: 900; color: #2563eb;
                margin: 0 0 8px; line-height: 1; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  th {{ background: #2563eb; color: white; text-align: left; padding: 8px 10px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; }}
  td {{ padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }}
  tr:nth-child(even) td {{ background: #f8fafc; }}
  .diagnosis-box {{ background: #eff6ff; border-left: 4px solid #2563eb;
                    border-radius: 4px; padding: 12px 16px; }}
  .notes-box {{ background: #fefce8; border-left: 4px solid #eab308;
                border-radius: 4px; padding: 12px 16px; }}
  .footer {{ margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;
             display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }}
  .sig-line {{ margin-top: 48px; border-top: 1px solid #1a1a2e; width: 200px;
               text-align: center; padding-top: 4px; font-size: 11px; color: #6b7280; }}
  @media print {{ body {{ padding: 16px; }} }}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">Cura<span>Book</span></div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px;">Digital Health Platform</div>
  </div>
  <div class="meta">
    <div><strong>Date:</strong> {date_str}</div>
    <div><strong>Prescription #:</strong> {prescription.id}</div>
    <div><strong>Status:</strong> {prescription.status}</div>
  </div>
</div>

<div class="section info-grid">
  <div class="info-box">
    <div class="label">Physician</div>
    <div class="value">Dr. {doctor_name}</div>
  </div>
  <div class="info-box">
    <div class="label">Patient</div>
    <div class="value">{patient_name}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Diagnosis</div>
  <div class="diagnosis-box">{diagnosis}</div>
</div>

<div class="section">
  <div class="rx-symbol">℞</div>
  <div class="section-title">Medications</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Medication</th><th>Dosage</th>
        <th>Frequency</th><th>Duration</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
</div>

{f'<div class="section"><div class="section-title">Additional Notes</div><div class="notes-box">{notes}</div></div>' if notes else ""}

<div class="footer">
  <div>Generated by CuraBook · {date_str}</div>
  <div>This is a digitally generated prescription.</div>
</div>

<div class="sig-line">Physician Signature</div>

</body>
</html>"""


def _pdf_via_weasyprint(prescription) -> bytes:
    from weasyprint import HTML as WP_HTML
    html_str = _build_html(prescription)
    return WP_HTML(string=html_str).write_pdf()


def _pdf_via_reportlab(prescription) -> bytes:
    """ReportLab fallback — produces a clean A4 text-based PDF."""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )

    buffer = BytesIO()
    doc    = SimpleDocTemplate(buffer, pagesize=A4,
                               leftMargin=20*mm, rightMargin=20*mm,
                               topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    blue   = colors.HexColor("#2563eb")

    title_style  = ParagraphStyle("title",  parent=styles["Title"],
                                  textColor=blue, fontSize=22, spaceAfter=4)
    h2_style     = ParagraphStyle("h2",     parent=styles["Heading2"],
                                  textColor=blue, fontSize=11, spaceAfter=4)
    body_style   = styles["BodyText"]
    small_style  = ParagraphStyle("small",  parent=styles["Normal"], fontSize=9)

    doctor_name  = prescription.doctor.full_name or prescription.doctor.username
    patient_name = prescription.patient.full_name or prescription.patient.username
    date_str     = prescription.created_at.strftime("%Y-%m-%d")

    story = [
        Paragraph("CuraBook", title_style),
        Paragraph("Digital Health Platform", small_style),
        HRFlowable(width="100%", thickness=2, color=blue, spaceAfter=8),
        Spacer(1, 4),
        Paragraph(f"<b>Date:</b> {date_str}   <b>Prescription #:</b> {prescription.id}", small_style),
        Spacer(1, 8),
        Paragraph("<b>Physician</b>", h2_style),
        Paragraph(f"Dr. {doctor_name}", body_style),
        Spacer(1, 4),
        Paragraph("<b>Patient</b>", h2_style),
        Paragraph(patient_name, body_style),
        Spacer(1, 8),
        Paragraph("<b>Diagnosis</b>", h2_style),
        Paragraph(prescription.diagnosis or "-", body_style),
        Spacer(1, 8),
        Paragraph("<b>&#8478; Medications</b>", h2_style),
    ]

    med_data = [["#", "Medication", "Dosage", "Frequency", "Duration", "Notes"]]
    for i, med in enumerate(prescription.medications.all(), 1):
        med_data.append([
            str(i), med.name, med.dosage or "-",
            med.frequency or "-", med.duration or "-", med.notes or "-",
        ])

    med_table = Table(med_data, hAlign="LEFT", repeatRows=1,
                      colWidths=[8*mm, 40*mm, 25*mm, 30*mm, 25*mm, None])
    med_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  blue),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTSIZE",    (0, 0), (-1, 0),  9),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("FONTSIZE",    (0, 1), (-1, -1), 9),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))

    story.append(med_table)

    if prescription.notes:
        story += [
            Spacer(1, 8),
            Paragraph("<b>Notes</b>", h2_style),
            Paragraph(prescription.notes, body_style),
        ]

    story += [
        Spacer(1, 16),
        HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey),
        Spacer(1, 4),
        Paragraph(f"Generated by CuraBook · {date_str}", small_style),
    ]

    doc.build(story)
    return buffer.getvalue()

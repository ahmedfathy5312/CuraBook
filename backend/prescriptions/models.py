"""
CuraBook — Prescriptions Models
=================================
A prescription is created by a doctor after a COMPLETED appointment.
It can be sent digitally to the patient.
"""

from django.db import models
from django.conf import settings
from common.soft_delete import SoftDeleteModel

User = settings.AUTH_USER_MODEL


class Prescription(SoftDeleteModel):
    """
    SEC-03 FIX: Inherits from SoftDeleteModel (was models.Model).
    Medical records must never be hard-deleted — Egyptian MoH requires
    7-year retention (see PRIVACY_AND_COMPLIANCE.md). Soft delete ensures
    audit trail integrity and compliance.
    """

    class Status(models.TextChoices):
        DRAFT  = "DRAFT",  "Draft"
        SENT   = "SENT",   "Sent"

    # ── Relations ─────────────────────────────────────────────
    doctor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="prescriptions_written",
        limit_choices_to={"is_doctor": True},
    )
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="prescriptions_received",
        limit_choices_to={"is_patient": True},
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.PROTECT,
        related_name="prescriptions",
        null=True, blank=True,
    )

    # ── Content ────────────────────────────────────────────────
    diagnosis = models.TextField(help_text="Doctor's diagnosis notes")
    notes     = models.TextField(blank=True, help_text="Additional instructions")
    status    = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    # B-05: Optional PDF/file attachment for the prescription document
    # Stores a URL (e.g. S3 presigned URL or media path) — no binary storage in DB.
    attachment_url = models.URLField(
        blank=True,
        null=True,
        help_text="Optional URL to a PDF/image of the prescription (S3, media, etc.)",
    )

    # ── Timestamps ─────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["doctor", "status"]),
            models.Index(fields=["patient", "status"]),
        ]

    def __str__(self):
        return f"Rx #{self.id} | Dr.{self.doctor_id} → Patient {self.patient_id}"


class PrescriptionMedication(models.Model):
    """
    Individual medication line within a prescription.
    One prescription can have multiple medications.
    """

    class FrequencyChoices(models.TextChoices):
        ONCE_DAILY    = "ONCE_DAILY",    "Once daily"
        TWICE_DAILY   = "TWICE_DAILY",   "Twice daily"
        THREE_DAILY   = "THREE_DAILY",   "Three times daily"
        FOUR_DAILY    = "FOUR_DAILY",    "Four times daily"
        AS_NEEDED     = "AS_NEEDED",     "As needed"
        OTHER         = "OTHER",         "Other"

    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="medications",
    )

    name      = models.CharField(max_length=255, help_text="Drug name")
    dosage    = models.CharField(max_length=100, help_text="e.g. 500mg")
    frequency = models.CharField(
        max_length=20,
        choices=FrequencyChoices.choices,
        default=FrequencyChoices.ONCE_DAILY,
    )
    duration  = models.CharField(max_length=100, blank=True, help_text="e.g. 7 days")
    notes     = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} {self.dosage} ({self.frequency})"

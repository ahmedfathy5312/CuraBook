from io import BytesIO

from django.http import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import permissions, viewsets
from rest_framework.decorators import action

from reports.models import Report
from reports.serializers import ReportSerializer


class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    """Patient-owned medical report list and secure file preview/download."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['get'], url_path='content')
    def content(self, request, pk=None):
        report = self.get_object()
        as_attachment = request.query_params.get('download') == '1'
        filename = f'report-{report.pk}.pdf'

        if report.file:
            try:
                return FileResponse(
                    report.file.open('rb'),
                    content_type='application/pdf',
                    as_attachment=as_attachment,
                    filename=report.file.name.rsplit('/', 1)[-1],
                )
            except (FileNotFoundError, OSError, ValueError):
                # A stale DB path must not make a visible report impossible to open.
                pass

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        pdf.setTitle(report.name or filename)
        pdf.setFont('Helvetica-Bold', 18)
        pdf.drawString(50, height - 70, 'CuraBook Medical Report')
        pdf.setFont('Helvetica', 12)
        lines = [
            ('Report', report.name or f'Report #{report.pk}'),
            ('Type', report.get_type_display()),
            ('Doctor', report.doctor_name or 'Not specified'),
            ('Date', report.created_at.strftime('%Y-%m-%d')),
            ('Patient', request.user.full_name or request.user.username),
        ]
        y = height - 115
        for label, value in lines:
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(50, y, f'{label}:')
            pdf.setFont('Helvetica', 11)
            pdf.drawString(135, y, str(value))
            y -= 26
        pdf.setFont('Helvetica-Oblique', 9)
        pdf.drawString(50, 45, 'Generated securely by CuraBook from the saved medical report record.')
        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return FileResponse(
            buffer,
            content_type='application/pdf',
            as_attachment=as_attachment,
            filename=filename,
        )
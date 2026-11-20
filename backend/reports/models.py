from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Report(models.Model):
    REPORT_TYPES = (
        ('APPOINTMENT', 'Appointment Summary'),
        ('PRESCRIPTION', 'Prescription List'),
        ('MEDICAL_HISTORY', 'Medical History'),
        ('BILLING', 'Billing Statement'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_reports')
    type = models.CharField(max_length=50, choices=REPORT_TYPES)
    name = models.CharField(max_length=255)
    doctor_name = models.CharField(max_length=255, blank=True, default='')
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    size = models.CharField(max_length=50, blank=True)
    icon = models.CharField(max_length=50, default='📊')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'reports'

    def __str__(self):
        return f"{self.name} ({self.user.username})"

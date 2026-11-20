"""
CuraBook — Assistants Domain
=============================
Responsible for: AssistantProfile.
Workplace assignments (ClinicAssistant, HospitalAssistant) live in clinics/ and hospital/.
"""
from django.conf import settings
from django.db import models

from common.models import PublicIdMixin
from common.soft_delete import SoftDeleteModel
from common.models import TimestampedModel


class AssistantProfile(PublicIdMixin, SoftDeleteModel, TimestampedModel):
    """
    Core assistant profile.
    One assistant can work in multiple clinics AND hospitals.
    Actual assignments: ClinicAssistant (clinics app), HospitalAssistant (hospital app)
    Inherits: is_deleted, deleted_at, created_at, updated_at from BaseModel.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assistant_profile",
    )
    can_manage_appointments = models.BooleanField(default=True)
    can_upload_documents    = models.BooleanField(default=False)
    can_edit_schedule       = models.BooleanField(default=False)
    permissions = models.JSONField(default=dict, blank=True)

    DEFAULT_PERMISSIONS = {
        'manage_appointments': True,
        'view_patient_records': True,
        'edit_patient_records': False,
        'write_prescriptions': False,
        'message_patients': True,
        'view_financial': False,
        'edit_schedule': False,
    }

    def effective_permissions(self):
        values = {**self.DEFAULT_PERMISSIONS, **(self.permissions or {})}
        # Keep the established backend flags in sync with the richer UI contract.
        values['manage_appointments'] = bool(values['manage_appointments'])
        values['edit_schedule'] = bool(values['edit_schedule'])
        return values

    def update_permissions(self, values):
        allowed = set(self.DEFAULT_PERMISSIONS)
        normalized = self.effective_permissions()
        normalized.update({key: bool(value) for key, value in values.items() if key in allowed})
        self.permissions = normalized
        self.can_manage_appointments = normalized['manage_appointments']
        self.can_edit_schedule = normalized['edit_schedule']
        self.can_upload_documents = normalized['edit_patient_records'] or normalized['write_prescriptions']
        self.save(update_fields=[
            'permissions', 'can_manage_appointments', 'can_edit_schedule',
            'can_upload_documents', 'updated_at',
        ])
        return normalized
    # created_at / updated_at / is_deleted / deleted_at → inherited from BaseModel

    class Meta(SoftDeleteModel.Meta):
        verbose_name        = "Assistant Profile"
        verbose_name_plural = "Assistant Profiles"

    def __str__(self):
        return f"Assistant: {self.user.username}"


class AssistantShift(TimestampedModel):
    """
    Represents a personal shift entry for an assistant.
    CRUD: POST/PATCH/DELETE /api/v1/assistant/schedule/
    """
    STATUS_CHOICES = [
        ('confirmed', 'مؤكد'),
        ('vacation',  'إجازة'),
        ('cancelled', 'ملغى'),
    ]

    assistant    = models.ForeignKey(
        AssistantProfile,
        on_delete=models.CASCADE,
        related_name='shifts',
    )
    place_name   = models.CharField(max_length=200)
    place_type   = models.CharField(max_length=50, default='clinic')
    doctor_name  = models.CharField(max_length=200, blank=True, default='')
    date         = models.DateField()
    start_time   = models.TimeField()
    end_time     = models.TimeField()
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name        = 'Assistant Shift'
        verbose_name_plural = 'Assistant Shifts'

    def __str__(self):
        return f"{self.assistant} — {self.date} {self.start_time}-{self.end_time}"

"""
CuraBook — Patients Domain
===========================
Responsible for: PatientProfile and patient-specific data.
"""

from django.conf import settings
from django.db import models

from common.models import TimestampedModel
from common.models import BaseModel  # UUID PK + SoftDelete + Timestamps


class PatientProfile(TimestampedModel):
    """
    Extended profile for patients.
    Inherits: created_at, updated_at from TimestampedModel.
    """
    user   = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )
    dob    = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    age    = models.PositiveIntegerField(blank=True, null=True)
    notes  = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name        = "Patient Profile"
        verbose_name_plural = "Patient Profiles"

    def __str__(self):
        return f"Patient: {self.user.username}"


# FIX BUG-03: PatientRecord model was missing — data was lost on every refresh
class PatientRecord(BaseModel):
    """
    Medical record for a patient, created/managed by a doctor.
    Matches prototype slide 43-44: Patient Management → New Patient Record → Record Details.
    """

    class BloodType(models.TextChoices):
        A_POS  = 'A+',  'A+'
        A_NEG  = 'A-',  'A-'
        B_POS  = 'B+',  'B+'
        B_NEG  = 'B-',  'B-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        O_POS  = 'O+',  'O+'
        O_NEG  = 'O-',  'O-'
        UNKNOWN = 'UNKNOWN', 'Unknown'

    # Relations
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_records',
        limit_choices_to={'is_patient': True},
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='doctor_patient_records',
        limit_choices_to={'is_doctor': True},
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='patient_records',
    )

    # FIX Backend-spec: medical_id is required by prototype slide 43 ("Patient ID" column)
    medical_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        help_text="Auto-generated unique medical record ID (e.g. MR-2026-00042)",
    )

    # Medical data
    chief_complaint  = models.TextField(blank=True, help_text="Main reason for visit")
    diagnosis        = models.TextField(blank=True)
    treatment_plan   = models.TextField(blank=True)
    notes            = models.TextField(blank=True)
    blood_type       = models.CharField(
        max_length=10,
        choices=BloodType.choices,
        default=BloodType.UNKNOWN,
        blank=True,
    )
    allergies        = models.TextField(blank=True, help_text="Comma-separated or free text")
    chronic_diseases = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)

    # Visit metadata
    visit_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name        = "Patient Record"
        verbose_name_plural = "Patient Records"
        ordering            = ['-created_at']

    def __str__(self):
        return f"Record #{self.medical_id or self.pk} — {self.patient} by Dr.{self.doctor}"

    def save(self, *args, **kwargs):
        # Auto-generate medical_id on first save if not set
        if not self.medical_id:
            import datetime, random
            from django.db import IntegrityError
            year = datetime.date.today().year
            for _ in range(20):  # retry up to 20 times to avoid collision
                rand = random.randint(10000, 999999)
                candidate = f"MR-{year}-{rand}"
                if not PatientRecord.objects.filter(medical_id=candidate).exists():
                    self.medical_id = candidate
                    break
            else:
                # Fallback: use uuid-based ID to guarantee uniqueness
                import uuid
                self.medical_id = f"MR-{year}-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


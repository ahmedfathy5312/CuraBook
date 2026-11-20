from django.db import models
from django.conf import settings
from appointments.models import Appointment
from clinics.models import Clinic
from hospital.models import Hospital
from common.soft_delete import SoftDeleteModel

User = settings.AUTH_USER_MODEL

class Review(SoftDeleteModel):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]  # 1 إلى 5 نجوم

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name='review'
    )
    patient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='reviews_given'
    )
    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='reviews_received'
    )
    clinic = models.ForeignKey(
        Clinic, null=True, blank=True, on_delete=models.SET_NULL
    )
    hospital = models.ForeignKey(
        Hospital, null=True, blank=True, on_delete=models.SET_NULL
    )

    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    is_anonymous = models.BooleanField(
        default=False,
        help_text='If True, patient name is hidden from public review display.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['doctor', 'rating']),
            models.Index(fields=['patient']),
        ]

    def __str__(self):
        return f"Review by {self.patient} for Dr. {self.doctor}"

    def save(self, *args, **kwargs):
        # تعبئة doctor / patient / clinic / hospital تلقائيًا من appointment
        # NOTE: appointment.doctor is a direct FK to User (not DoctorProfile)
        if not self.doctor_id:
            self.doctor = self.appointment.doctor
        if not self.patient_id:
            self.patient = self.appointment.patient
        if not self.clinic_id and self.appointment.clinic_id:
            self.clinic = self.appointment.clinic
        if not self.hospital_id and self.appointment.hospital_id:
            self.hospital = self.appointment.hospital
        super().save(*args, **kwargs)

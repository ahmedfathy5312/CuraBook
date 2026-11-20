from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

from common.models import BaseModel, TimestampedModel, PublicIdMixin
from common.soft_delete import SoftDeleteModel

User = settings.AUTH_USER_MODEL


# ==================================================
# Schedule (Unified Scheduling Engine)
# Defines the recurring weekly schedule for a doctor
# at a specific clinic OR hospital (not both at once)
# ==================================================
class Schedule(SoftDeleteModel, TimestampedModel):
    """
    Defines a doctor's recurring weekly working hours
    at a specific clinic OR hospital.
    """

    DAY_CHOICES = [
        (0, 'Saturday'),
        (1, 'Sunday'),
        (2, 'Monday'),
        (3, 'Tuesday'),
        (4, 'Wednesday'),
        (5, 'Thursday'),
        (6, 'Friday'),
    ]

    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='schedules'
    )

    # One of these must be set — not both
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='schedules'
    )
    hospital = models.ForeignKey(
        'hospital.Hospital',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='schedules'
    )

    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.PositiveIntegerField(
        default=30,
        help_text="Duration of each slot in minutes"
    )

    is_active = models.BooleanField(default=True)
    # created_at / updated_at / is_deleted / deleted_at → inherited from BaseModel

    class Meta:
        unique_together = ('doctor', 'clinic', 'hospital', 'day_of_week', 'start_time')
        indexes = [
            models.Index(fields=['doctor', 'day_of_week']),
            models.Index(fields=['clinic']),
            models.Index(fields=['hospital']),
        ]
        verbose_name = "Schedule"
        verbose_name_plural = "Schedules"

    def clean(self):
        errors = {}

        if self.end_time <= self.start_time:
            errors['end_time'] = "End time must be after start time."

        # Must be linked to clinic OR hospital — not both, not neither
        if self.clinic and self.hospital:
            errors['clinic'] = "A schedule must be linked to either a clinic OR a hospital, not both."
        if not self.clinic and not self.hospital:
            errors['clinic'] = "A schedule must be linked to either a clinic or a hospital."

        if errors:
            raise ValidationError(errors)

        # ── Schedule Overlap Validation (Bug #14) ─────────────────────────
        # Prevent a doctor from having two overlapping schedules on the same
        # day at the same location. Overlap means the time ranges intersect.
        if self.doctor_id and self.day_of_week is not None:
            qs = Schedule.objects.filter(
                doctor_id=self.doctor_id,
                day_of_week=self.day_of_week,
                is_active=True,
            ).exclude(pk=self.pk)  # exclude self when editing

            # Location filter: only check same location type
            if self.clinic_id:
                qs = qs.filter(clinic_id=self.clinic_id)
            elif self.hospital_id:
                qs = qs.filter(hospital_id=self.hospital_id)

            # Two time ranges [A_start, A_end) and [B_start, B_end) overlap if:
            # A_start < B_end AND A_end > B_start
            overlapping = qs.filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )

            if overlapping.exists():
                overlap = overlapping.first()
                raise ValidationError({
                    'start_time': (
                        f"This schedule conflicts with an existing schedule "
                        f"({overlap.start_time}–{overlap.end_time}) "
                        f"on the same day and location."
                    )
                })

    def __str__(self):
        location = self.clinic or self.hospital
        return f"Dr.{self.doctor} | {self.get_day_of_week_display()} {self.start_time}–{self.end_time} @ {location}"



# ==================================================
# TimeOff
# Doctor unavailability (break, holiday, block)
# ==================================================
class TimeOff(TimestampedModel):
    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='timeoffs'
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['doctor', 'start', 'end']),
        ]

    def clean(self):
        if self.end <= self.start:
            raise ValidationError("End must be after start")

    def __str__(self):
        return f"{self.doctor} off: {self.start} → {self.end}"


# ==================================================
# GeneratedSlot
# Each bookable time slot — linked to Schedule (clinic or hospital)
# ==================================================
class GeneratedSlot(PublicIdMixin, SoftDeleteModel, TimestampedModel):
    """
    A concrete time slot generated from a Schedule.
    Must be linked to either a clinic or a hospital (via schedule).
    """

    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='slots'
    )

    # Slot must know WHERE it belongs (clinic OR hospital)
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='slots'
    )
    hospital = models.ForeignKey(
        'hospital.Hospital',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='slots'
    )

    # Back-reference to the schedule that generated this slot
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='generated_slots'
    )

    start = models.DateTimeField()
    end = models.DateTimeField()

    is_booked = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    # created_at / updated_at / is_deleted / deleted_at → inherited from BaseModel

    class Meta:
        ordering = ['start']
        unique_together = ('doctor', 'start', 'end')
        indexes = [
            models.Index(fields=['doctor', 'start']),
            models.Index(fields=['clinic', 'is_booked', 'is_active']),
            models.Index(fields=['hospital', 'is_booked', 'is_active']),
        ]
        verbose_name = "Generated Slot"
        verbose_name_plural = "Generated Slots"

    def clean(self):
        errors = {}

        if self.end <= self.start:
            errors['end'] = "End must be after start."

        if self.clinic and self.hospital:
            errors['clinic'] = "Slot must belong to either a clinic OR a hospital, not both."

        if not self.clinic and not self.hospital:
            errors['clinic'] = "Slot must belong to either a clinic or a hospital."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        location = self.clinic or self.hospital
        return f"Slot [{self.start} → {self.end}] Dr.{self.doctor} @ {location}"


# ==================================================
# BlockedSlot — Emergency day/range blocking
# Doctor or hospital admin can block entire days
# (e.g., equipment maintenance, doctor conference)
# ==================================================
class BlockedSlot(TimestampedModel):
    """
    Blocks an entire date range from accepting new bookings.
    Unlike TimeOff (doctor-initiated), this can be created by:
      - Doctor themselves
      - Hospital admin (for a hospital)
      - Clinic assistant (for a clinic)

    When a BlockedSlot exists, slot generation is skipped for that range
    and existing unbooked slots are deactivated.
    """

    REASON_CHOICES = [
        ("vacation",     "Doctor Vacation"),
        ("conference",   "Medical Conference"),
        ("maintenance",  "Clinic/Hospital Maintenance"),
        ("emergency",    "Emergency Closure"),
        ("other",        "Other"),
    ]

    doctor = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name="blocked_slots", null=True, blank=True
    )
    clinic = models.ForeignKey(
        "clinics.Clinic", on_delete=models.CASCADE,
        related_name="blocked_slots", null=True, blank=True
    )
    hospital = models.ForeignKey(
        "hospital.Hospital", on_delete=models.CASCADE,
        related_name="blocked_slots", null=True, blank=True
    )

    start_date = models.DateField()
    end_date   = models.DateField()

    reason     = models.CharField(max_length=20, choices=REASON_CHOICES, default="other")
    note       = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_blocked_slots"
    )
    # created_at / updated_at → inherited from TimestampedModel

    class Meta:
        verbose_name        = "Blocked Slot"
        verbose_name_plural = "Blocked Slots"
        indexes = [
            models.Index(fields=["doctor", "start_date", "end_date"]),
            models.Index(fields=["clinic", "start_date"]),
            models.Index(fields=["hospital", "start_date"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date must be on or after start date."})

    def __str__(self):
        target = self.doctor or self.clinic or self.hospital
        return f"Blocked: {target} ({self.start_date} → {self.end_date}) [{self.reason}]"

    def deactivate_slots(self):
        """
        Deactivate all unbooked GeneratedSlots in this date range.
        Call after creating a BlockedSlot.
        """
        filters = {"is_booked": False, "is_active": True,
                   "start__date__gte": self.start_date,
                   "start__date__lte": self.end_date}
        if self.doctor:
            filters["doctor"] = self.doctor
        if self.clinic:
            filters["clinic"] = self.clinic
        if self.hospital:
            filters["hospital"] = self.hospital

        return GeneratedSlot.objects.filter(**filters).update(is_active=False)

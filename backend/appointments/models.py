from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError

from common.models import PublicIdMixin, TimestampedModel
from common.soft_delete import SoftDeleteModel

User = settings.AUTH_USER_MODEL


# ==================================================
# Appointment Model
# ==================================================
class Appointment(PublicIdMixin, SoftDeleteModel, TimestampedModel):

    class Status(models.TextChoices):
        PENDING   = 'PENDING',    'Pending'
        CONFIRMED = 'CONFIRMED',  'Confirmed'
        REJECTED  = 'REJECTED',   'Rejected'
        CANCELLED = 'CANCELLED',  'Cancelled'
        COMPLETED = 'COMPLETED',  'Completed'
        RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED', 'Reschedule Requested'
        NO_SHOW   = 'NO_SHOW',    'No Show'   # FIX BUG-04: required by enterprise spec

    class VisitType(models.TextChoices):
        IN_PERSON = 'IN_PERSON', 'In Person'
        ONLINE    = 'ONLINE',    'Online'

    # -------------------------
    # Relations
    # -------------------------

    # Clinic OR Hospital — one must be set, not both
    hospital = models.ForeignKey(
        'hospital.Hospital',
        on_delete=models.PROTECT,
        null=True, blank=True,          # ✅ nullable — booking can be clinic-only
        related_name='appointments'
    )

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.PROTECT,
        null=True, blank=True,          # ✅ nullable — booking can be hospital-only
        related_name='appointments'
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='appointments_as_doctor'
    )

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='appointments_as_patient'
    )

    slot = models.OneToOneField(
        'scheduling.GeneratedSlot',
        on_delete=models.PROTECT,
        related_name='appointment'
    )

    # -------------------------
    # Data
    # -------------------------
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING
    )

    visit_type = models.CharField(
        max_length=20,
        choices=VisitType.choices,
        default=VisitType.IN_PERSON
    )

    reason = models.TextField(
        blank=True, null=True,
        help_text="Reason for visit"
    )

    rejection_reason = models.TextField(
        blank=True, null=True,
        help_text="Reason if appointment was rejected"
    )

    # Reschedule support
    reschedule_slot = models.ForeignKey(
        'scheduling.GeneratedSlot',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reschedule_appointment',
        help_text="New slot requested in a RESCHEDULE_REQUESTED flow"
    )

    reschedule_reason = models.TextField(
        blank=True, null=True,
        help_text="Reason provided by patient when requesting reschedule"
    )

    expires_at = models.DateTimeField(
        blank=True, null=True,
        help_text="Expiry time for pending appointments"
    )

    session_notes = models.TextField(
        blank=True, null=True,
        help_text="Doctor's notes after session completion"
    )

    # ── Idempotency guards for Celery reminder tasks ──────────────────────────
    # Without these, a Celery retry or a Beat schedule overlap would fire the
    # same reminder twice.  The task sets this field after a successful send,
    # and the selector filters on __isnull=True so already-sent reminders are
    # never re-queued.
    reminder_24h_sent_at = models.DateTimeField(
        blank=True, null=True, db_index=True,
        help_text="Timestamp when the 24-hour reminder was dispatched. "
                  "Null means the reminder has not been sent yet."
    )
    reminder_1h_sent_at = models.DateTimeField(
        blank=True, null=True, db_index=True,
        help_text="Timestamp when the 1-hour reminder was dispatched. "
                  "Null means the reminder has not been sent yet."
    )

    # created_at / updated_at / is_deleted / deleted_at → inherited from BaseModel

    # -------------------------
    # Meta
    # -------------------------
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['clinic']),
            models.Index(fields=['hospital']),
            models.Index(fields=['status', 'expires_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(patient=models.F('doctor')),
                name='patient_not_doctor'
            ),
            # Must have either clinic or hospital
            models.CheckConstraint(
                condition=(
                    models.Q(clinic__isnull=False, hospital__isnull=True) |
                    models.Q(clinic__isnull=True, hospital__isnull=False)
                ),
                name='appointment_location_xor'
            ),
            # ✅ DB-LEVEL DOUBLE BOOKING GUARD (defense in depth)
            # Final safety net: only one ACTIVE booking per slot at DB level.
            # Application-level: select_for_update() in services.py
            models.UniqueConstraint(
                fields=['slot'],
                condition=models.Q(
                    status__in=['PENDING', 'CONFIRMED', 'COMPLETED', 'RESCHEDULE_REQUESTED']
                ),
                name='unique_active_booking_per_slot',
            ),
        ]

    # -------------------------
    # Validation
    # -------------------------
    def clean(self):
        errors = {}

        # Clinic XOR Hospital
        if self.clinic and self.hospital:
            errors['clinic'] = "Appointment must be at a clinic OR hospital, not both."
        if not self.clinic and not self.hospital:
            errors['clinic'] = "Appointment must have either a clinic or a hospital."

        # Slot → Doctor consistency
        if self.slot_id and self.doctor_id:
            if self.slot.doctor_id != self.doctor_id:
                errors['slot'] = "Slot does not belong to this doctor."

        # Slot location consistency
        if self.slot_id:
            if self.clinic_id and self.slot.clinic_id != self.clinic_id:
                errors['slot'] = "Slot does not belong to this clinic."
            if self.hospital_id and self.slot.hospital_id != self.hospital_id:
                errors['slot'] = "Slot does not belong to this hospital."

        if errors:
            raise ValidationError(errors)

    # -------------------------
    # Business Logic
    # -------------------------
    def is_expired(self):
        return bool(self.expires_at and timezone.now() > self.expires_at)

    def can_be_cancelled(self):
        return self.status in {
            self.Status.PENDING,
            self.Status.CONFIRMED
        }

    def can_be_confirmed(self):
        return self.status == self.Status.PENDING

    def can_be_rejected(self):
        return self.status == self.Status.PENDING

    def can_be_completed(self):
        return self.status == self.Status.CONFIRMED

    def can_be_marked_no_show(self):
        """FIX BUG-04: doctor can mark NO_SHOW only on CONFIRMED appointments."""
        return self.status == self.Status.CONFIRMED

    def get_location(self):
        """Returns clinic or hospital, whichever is set."""
        return self.clinic or self.hospital

    def __str__(self):
        location = self.clinic or self.hospital
        return f"Appointment #{self.id} | {self.status} | {location}"


from common.models import TimestampedModel


# ==================================================
# Appointment History
# ==================================================
class AppointmentHistory(TimestampedModel):

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='history'
    )

    old_status = models.CharField(
        max_length=30,
        choices=Appointment.Status.choices,
        blank=True  # empty string on creation
    )

    new_status = models.CharField(
        max_length=30,
        choices=Appointment.Status.choices
    )

    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='appointment_changes'
    )

    note = models.TextField(blank=True, null=True)
    # changed_at → use inherited created_at from TimestampedModel

    class Meta:
        ordering = ['-created_at']
        indexes = [
            # LOW-07 FIX: Replace individual indexes with a composite index.
            # Real-world query is always: WHERE appointment_id = X ORDER BY created_at DESC
            # A composite index covers this in a single B-tree scan instead of two.
            models.Index(fields=['appointment', '-created_at'], name='appt_history_appt_time_idx'),
        ]

    def __str__(self):
        return (
            f"Appointment #{self.appointment_id}: "
            f"{self.old_status} → {self.new_status}"
        )

# Archive model lives in archive_models.py — imported here for Django app registry
from appointments.archive_models import AppointmentArchive  # noqa: F401

"""
CuraBook — Appointment Archiving System
========================================
Handles moving old COMPLETED/CANCELLED appointments to a cold-storage archive
table to keep the main `appointments_appointment` table lean and fast.

Architecture:
    1. AppointmentArchive model  — cold storage table (this file)
    2. archiving/services.py     — archiving logic (run via Celery)
    3. Celery Beat               — runs weekly (see curabook/celery.py)

Strategy:
    • Appointments older than ARCHIVE_AFTER_DAYS (default: 180 days) with
      status COMPLETED or CANCELLED are eligible for archiving.
    • Archived data is stored in AppointmentArchive as a JSON snapshot.
    • Original Appointment row is SOFT-DELETED after archiving (not hard deleted).
    • AppointmentArchive rows are never deleted — they are the audit trail.

Why not delete?
    Medical data has regulatory retention requirements.
    Hard deletion violates most healthcare data laws (HIPAA, Egyptian health data laws).
    Archiving = performance benefit + legal compliance.
"""

from django.db import models
import uuid


class AppointmentArchive(models.Model):
    """
    Cold-storage snapshot of archived appointments.

    Stores a full JSON snapshot of the appointment at the time of archiving,
    including all related data (doctor, patient, slot, history).

    Immutable — never update, only insert.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # Reference to original appointment (soft-deleted, may still exist)
    original_appointment_id = models.IntegerField(
        db_index=True,
        help_text="Integer PK of the original Appointment row."
    )

    original_public_id = models.UUIDField(
        db_index=True,
        null=True, blank=True,
        help_text="public_id of the original Appointment (UUID)."
    )

    # Who was involved
    patient_id = models.IntegerField(db_index=True)
    doctor_id  = models.IntegerField(db_index=True)

    # Snapshot of status at archive time
    final_status = models.CharField(max_length=30, db_index=True)

    # Full JSON snapshot — includes appointment + history + slot data
    snapshot = models.JSONField(
        help_text=(
            "Full serialized snapshot of the appointment at archive time. "
            "Includes: appointment fields, AppointmentHistory list, slot details."
        )
    )

    # When the original appointment was created vs when it was archived
    appointment_created_at = models.DateTimeField()
    archived_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Appointment Archive"
        verbose_name_plural = "Appointment Archives"
        ordering = ['-archived_at']
        indexes = [
            models.Index(fields=['patient_id', 'archived_at']),
            models.Index(fields=['doctor_id',  'archived_at']),
            models.Index(fields=['final_status', 'archived_at']),
        ]

    def __str__(self):
        return (
            f"Archive #{self.original_appointment_id} "
            f"[{self.final_status}] archived {self.archived_at:%Y-%m-%d}"
        )

"""
CuraBook — Appointment Archiving Service
==========================================
Business logic for archiving old appointments.

Usage (called by Celery task weekly):
    from appointments.archiving import run_archiving_cycle
    archived_count = run_archiving_cycle()

Policy:
    • Archive appointments with status COMPLETED or CANCELLED
      that are older than ARCHIVE_AFTER_DAYS (default: 180 days).
    • Snapshot includes appointment fields + full history.
    • Original row is soft-deleted AFTER successful archive write.
    • All operations wrapped in atomic transactions — no partial archives.
    • Processes in batches of BATCH_SIZE to avoid memory spikes.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Appointment, AppointmentHistory
from .archive_models import AppointmentArchive

logger = logging.getLogger('curabook')

# ── Configuration ──────────────────────────────────────────────────────────────
ARCHIVE_AFTER_DAYS = 180          # Archive appointments older than 6 months
BATCH_SIZE         = 500          # Process N appointments per batch
ARCHIVABLE_STATUSES = {
    Appointment.Status.COMPLETED,
    Appointment.Status.CANCELLED,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_snapshot(appointment: Appointment) -> dict:
    """
    Build a full JSON-serializable snapshot of an appointment.
    Includes all appointment fields + full history log.
    """
    history = list(
        AppointmentHistory.objects.filter(appointment=appointment)
        .order_by('created_at')
        .values(
            'old_status', 'new_status',
            'changed_by_id', 'note', 'created_at',
        )
    )

    # Make datetimes JSON-safe
    for entry in history:
        if entry.get('created_at'):
            entry['created_at'] = entry['created_at'].isoformat()

    slot_data = None
    if appointment.slot_id:
        try:
            slot = appointment.slot
            slot_data = {
                'id':         slot.id,
                'start':      slot.start.isoformat() if slot.start else None,
                'end':        slot.end.isoformat()   if slot.end   else None,
                'is_booked':  slot.is_booked,
            }
        except Exception:
            slot_data = {'id': appointment.slot_id}

    return {
        'appointment': {
            'id':                appointment.id,
            'public_id':         str(appointment.public_id) if appointment.public_id else None,
            'status':            appointment.status,
            'visit_type':        appointment.visit_type,
            'reason':            appointment.reason,
            'rejection_reason':  appointment.rejection_reason,
            'expires_at':        appointment.expires_at.isoformat() if appointment.expires_at else None,
            'created_at':        appointment.created_at.isoformat(),
            'updated_at':        appointment.updated_at.isoformat(),
            'doctor_id':         appointment.doctor_id,
            'patient_id':        appointment.patient_id,
            'clinic_id':         appointment.clinic_id,
            'hospital_id':       appointment.hospital_id,
            'slot_id':           appointment.slot_id,
        },
        'slot':    slot_data,
        'history': history,
    }


# ── Main Service ───────────────────────────────────────────────────────────────

def get_archivable_queryset():
    """
    Returns a queryset of appointments eligible for archiving.
    Excludes already-soft-deleted ones (shouldn't happen, but safety net).
    """
    cutoff = timezone.now() - timedelta(days=ARCHIVE_AFTER_DAYS)
    return (
        Appointment.objects
        .filter(
            status__in=ARCHIVABLE_STATUSES,
            created_at__lt=cutoff,
            is_deleted=False,
        )
        .select_related('slot')
        .order_by('created_at')          # oldest first
    )


def archive_single_appointment(appointment: Appointment) -> bool:
    """
    Archive a single appointment atomically.

    Returns True if archived successfully, False if already archived.
    Raises on unexpected errors (let Celery handle retry).
    """
    # Idempotency check — don't double-archive
    if AppointmentArchive.objects.filter(
        original_appointment_id=appointment.id
    ).exists():
        logger.warning(
            f'[Archive] Appointment #{appointment.id} already archived — skipping.'
        )
        return False

    snapshot = _build_snapshot(appointment)

    with transaction.atomic():
        AppointmentArchive.objects.create(
            original_appointment_id = appointment.id,
            original_public_id      = getattr(appointment, 'public_id', None),
            patient_id              = appointment.patient_id,
            doctor_id               = appointment.doctor_id,
            final_status            = appointment.status,
            snapshot                = snapshot,
            appointment_created_at  = appointment.created_at,
        )

        # Soft-delete the original AFTER the archive is safely written
        appointment.is_deleted  = True
        appointment.deleted_at  = timezone.now()
        appointment.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])

    return True


def run_archiving_cycle() -> int:
    """
    Run a full archiving cycle — processes all eligible appointments in batches.

    Returns total count of archived appointments in this cycle.
    Called by Celery Beat weekly.
    """
    total_archived = 0
    qs = get_archivable_queryset()
    total_eligible = qs.count()

    if total_eligible == 0:
        logger.info('[Archive] No appointments eligible for archiving.')
        return 0

    logger.info(f'[Archive] Starting cycle — {total_eligible} appointments eligible.')

    # Process in batches to avoid loading entire table into memory
    offset = 0
    while True:
        batch = list(qs[offset: offset + BATCH_SIZE])
        if not batch:
            break

        batch_archived = 0
        for appointment in batch:
            try:
                if archive_single_appointment(appointment):
                    batch_archived += 1
            except Exception as exc:
                logger.error(
                    f'[Archive] Failed to archive appointment #{appointment.id}: {exc}',
                    exc_info=True,
                )
                # Continue with next — don't abort entire batch on single failure

        total_archived += batch_archived
        logger.info(
            f'[Archive] Batch {offset}–{offset + BATCH_SIZE}: '
            f'{batch_archived}/{len(batch)} archived.'
        )
        offset += BATCH_SIZE

    logger.info(f'[Archive] Cycle complete — {total_archived} appointments archived.')
    return total_archived

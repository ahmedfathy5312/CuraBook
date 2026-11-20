"""
CuraBook — Appointment Business Logic Services

Notifications are handled entirely by signals (appointments/signals.py).
Services focus ONLY on business logic and DB operations.
"""

import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied
from datetime import timedelta

from .models import Appointment, AppointmentHistory
from scheduling.models import GeneratedSlot

# Redis distributed lock — second layer of defence after select_for_update
from infrastructure.redis import acquire_slot_lock, SlotAlreadyLockedException, RedisLockException

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Internal Helpers
# ─────────────────────────────────────────────
def _get_slot_locked(slot_id: int) -> GeneratedSlot:
    """Fetch slot with SELECT FOR UPDATE — prevents double booking race condition."""
    try:
        return GeneratedSlot.objects.select_for_update().get(
            id=slot_id, is_active=True
        )
    except GeneratedSlot.DoesNotExist:
        raise ValidationError("Appointment not found or unavailable.")


def _record_history(appointment, old_status, new_status, user, note=""):
    AppointmentHistory.objects.create(
        appointment=appointment,
        old_status=old_status or '',
        new_status=new_status,
        changed_by=user,
        note=note,
    )


def _assert_can_manage(appointment: Appointment, user):
    """Raise PermissionDenied if user cannot confirm/reject this appointment."""
    if appointment.doctor_id == user.id:
        return
    if _is_assistant_of(appointment, user):
        return
    if getattr(user, 'hospital_admin', False) and appointment.hospital_id:
        if user.hospital_admin_links.filter(hospital_id=appointment.hospital_id).exists():
            return
    raise PermissionDenied("You do not have permission to manage this appointment.")


def _is_assistant_of(appointment: Appointment, user) -> bool:
    if not getattr(user, 'is_assistant', False):
        return False
    try:
        ap = user.assistant_profile
    except Exception:
        return False

    if appointment.clinic_id:
        from clinics.models import ClinicAssistant
        return ClinicAssistant.objects.filter(
            assistant=ap, clinic_id=appointment.clinic_id, is_active=True
        ).exists()

    if appointment.hospital_id:
        from hospital.models import HospitalAssistant
        return HospitalAssistant.objects.filter(
            assistant=ap, hospital_id=appointment.hospital_id, is_active=True
        ).exists()

    return False


# ─────────────────────────────────────────────
# Internal — change status
# ─────────────────────────────────────────────
@transaction.atomic
def _change_status(appointment: Appointment, new_status: str, user, note: str = ""):
    """Save new status + record history. Signal handles notifications."""
    if appointment.status == new_status:
        return appointment

    old_status = appointment.status
    appointment.status = new_status
    appointment.save(update_fields=['status', 'updated_at'])

    _record_history(appointment, old_status, new_status, user, note)
    return appointment


# ─────────────────────────────────────────────
# Create Appointment
# ─────────────────────────────────────────────
def create_appointment(patient, doctor, slot_id: int, reason=None, visit_type=None):
    """
    1. Redis distributed lock  (Layer 1 — cross-process race protection)
    2. DB SELECT FOR UPDATE    (Layer 2 — DB-level lock)
    3. DB UniqueConstraint     (Layer 3 — last resort)
    4. Creates Appointment (PENDING)
    5. Marks slot booked
    6. Records history
    — Signals fire notifications automatically —
    """
    try:
        with acquire_slot_lock(slot_id=slot_id, timeout=5.0):
            return _do_create_appointment(patient, doctor, slot_id, reason, visit_type)
    except SlotAlreadyLockedException:
        raise ValidationError("This slot is being booked by another patient. Please try again in a few seconds.")
    except RedisLockException as e:
        # Redis is down — fall back to DB-only locking (select_for_update)
        logger.warning(f"[Appointment] Redis unavailable, falling back to DB lock only: {e}")
        return _do_create_appointment(patient, doctor, slot_id, reason, visit_type)


@transaction.atomic
def _do_create_appointment(patient, doctor, slot_id: int, reason=None, visit_type=None):
    """Inner implementation — always called within lock context."""
    slot = _get_slot_locked(slot_id)

    if slot.is_booked:
        raise ValidationError("This slot is already booked.")

    if slot.start < timezone.now():
        raise ValidationError("Cannot book an appointment in the past.")

    if slot.doctor_id != doctor.id:
        raise ValidationError("This slot does not belong to this doctor.")

    if not slot.clinic and not slot.hospital:
        raise ValidationError("Appointment must be linked to a clinic or hospital.")

    appointment = Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        slot=slot,
        clinic=slot.clinic,
        hospital=slot.hospital,
        reason=reason,
        visit_type=visit_type or Appointment.VisitType.IN_PERSON,
        status=Appointment.Status.PENDING,
        expires_at=timezone.now() + timedelta(minutes=30),
    )

    slot.is_booked = True
    slot.save(update_fields=['is_booked'])

    _record_history(
        appointment=appointment,
        old_status='',
        new_status=Appointment.Status.PENDING,
        user=patient,
        note="New booking request",
    )

    logger.info(f'[Appointment] Created #{appointment.id} patient={patient.id} doctor={doctor.id}')
    return appointment


# ─────────────────────────────────────────────
# Confirm
# ─────────────────────────────────────────────
@transaction.atomic
def confirm_appointment(appointment: Appointment, user):
    if not appointment.can_be_confirmed():
        raise ValidationError("Only PENDING appointments can be confirmed.")
    _assert_can_manage(appointment, user)
    result = _change_status(appointment, Appointment.Status.CONFIRMED, user, "Appointment confirmed")

    # AUTO-CREATE VIDEO SESSION for ONLINE appointments on confirmation
    # This ensures video_session_id is always available in the API response
    # so the frontend can show the "Join" button immediately after confirmation.
    if appointment.visit_type == Appointment.VisitType.ONLINE:
        try:
            from video.services import create_video_session
            from video.models import VideoSession
            # Only create if one doesn't already exist
            if not VideoSession.objects.filter(appointment=appointment).exists():
                create_video_session(appointment)
        except Exception as e:
            # Non-critical — appointment is still confirmed, video session can be created later
            logger.error(f"[Video] Failed to create session for appointment #{appointment.id}: {e}")

    return result


# ─────────────────────────────────────────────
# Reject
# ─────────────────────────────────────────────
@transaction.atomic
def reject_appointment(appointment: Appointment, user, reason: str = ""):
    if not appointment.can_be_rejected():
        raise ValidationError("Only PENDING appointments can be rejected.")
    _assert_can_manage(appointment, user)

    # Free the slot
    slot = appointment.slot
    slot.is_booked = False
    slot.save(update_fields=['is_booked'])

    if reason:
        appointment.rejection_reason = reason
        appointment.save(update_fields=['rejection_reason'])

    return _change_status(
        appointment, Appointment.Status.REJECTED, user,
        note=f"Appointment rejected. {reason}".strip()
    )


# ─────────────────────────────────────────────
# Cancel
# ─────────────────────────────────────────────
@transaction.atomic
def cancel_appointment(appointment: Appointment, user):
    if not appointment.can_be_cancelled():
        raise ValidationError("This appointment cannot be cancelled.")

    is_patient   = appointment.patient_id == user.id
    is_doctor    = appointment.doctor_id == user.id
    is_assistant = _is_assistant_of(appointment, user)

    if not (is_patient or is_doctor or is_assistant):
        raise PermissionDenied("You do not have permission to cancel this appointment.")

    slot = appointment.slot
    slot.is_booked = False
    slot.save(update_fields=['is_booked'])

    return _change_status(appointment, Appointment.Status.CANCELLED, user, "Appointment cancelled")


# ─────────────────────────────────────────────
# Complete
# ─────────────────────────────────────────────
@transaction.atomic
def complete_appointment(appointment: Appointment, user, notes: str = ""):
    if not appointment.can_be_completed():
        raise ValidationError("Only CONFIRMED appointments can be completed.")
    if appointment.doctor_id != user.id:
        raise PermissionDenied("Only the doctor can mark the appointment as completed.")
    if notes:
        appointment.session_notes = notes
        appointment.save(update_fields=['session_notes'])
    return _change_status(appointment, Appointment.Status.COMPLETED, user, "Appointment completed")


@transaction.atomic
def mark_no_show(appointment: Appointment, user):
    """
    FIX BUG-04: POST /api/v1/appointments/{id}/no-show/
    Doctor marks a CONFIRMED appointment as NO_SHOW (patient did not attend).
    Frees the slot so it can be re-used.
    """
    if not appointment.can_be_marked_no_show():
        raise ValidationError("Only CONFIRMED appointments can be marked as no-show.")
    if appointment.doctor_id != user.id:
        raise PermissionDenied("Only the doctor can mark the appointment as no-show.")

    # Free the slot
    slot = appointment.slot
    if slot:
        slot.is_booked = False
        slot.save(update_fields=['is_booked'])

    return _change_status(
        appointment,
        Appointment.Status.NO_SHOW,
        user,
        "Patient did not attend the appointment",
    )


# ─────────────────────────────────────────────
# Expire (called by Celery)
# ─────────────────────────────────────────────
@transaction.atomic
def expire_appointment(appointment: Appointment):
    """
    Auto-cancel a PENDING appointment past expires_at.

    F-09 FIX: Now fires patient notifications after cancellation so the patient
    is informed their booking expired (previously silent — no SMS, no email, no push).
    """
    if not (appointment.is_expired() and appointment.status == Appointment.Status.PENDING):
        return appointment

    slot = appointment.slot
    slot.is_booked = False
    slot.save(update_fields=['is_booked'])

    appointment.status = Appointment.Status.CANCELLED
    appointment.save(update_fields=['status', 'updated_at'])

    _record_history(
        appointment=appointment,
        old_status=Appointment.Status.PENDING,
        new_status=Appointment.Status.CANCELLED,
        user=None,
        note="Appointment request expired automatically",
    )

    # Appointment post_save handles the persisted notification, WebSocket push,
    # email and SMS exactly once. Calling the notification pipeline again here
    # produced duplicate cancellation notifications.

    return appointment


# ─────────────────────────────────────────────
# Send Reminder (called by Celery)
# ─────────────────────────────────────────────
def send_appointment_reminder(appointment: Appointment):
    """Trigger 24h reminder notification via notification service."""
    if appointment.status != Appointment.Status.CONFIRMED:
        return
    from notifications.services import notify_appointment_reminder
    notify_appointment_reminder(appointment)


# ─────────────────────────────────────────────
# Reschedule (patient requests, doctor/assistant approves)
# ─────────────────────────────────────────────
@transaction.atomic
def request_reschedule(appointment: Appointment, patient, new_slot_id: int, reason: str = ""):
    """
    Patient requests to reschedule a CONFIRMED appointment to a new slot.
    - Old slot stays booked until reschedule is approved/rejected.
    - New slot gets a temporary hold (is_booked=True).
    - Appointment moves to RESCHEDULE_REQUESTED status.
    """
    if appointment.patient_id != patient.id:
        raise PermissionDenied("Only the patient can request rescheduling.")

    allowed_statuses = [Appointment.Status.CONFIRMED, Appointment.Status.PENDING]
    if appointment.status not in allowed_statuses:
        raise ValidationError("Rescheduling is only allowed for confirmed or pending appointments.")

    if new_slot_id == appointment.slot_id:
        raise ValidationError("The new slot is the same as the current appointment.")

    try:
        with acquire_slot_lock(slot_id=new_slot_id, timeout=5.0):
            new_slot = GeneratedSlot.objects.select_for_update().get(
                id=new_slot_id, is_active=True
            )
    except SlotAlreadyLockedException:
        raise ValidationError("The new slot is being booked. Please try again.")
    except RedisLockException as e:
        logger.warning(f"[Reschedule] Redis unavailable: {e}")
        new_slot = _get_slot_locked(new_slot_id)
    except GeneratedSlot.DoesNotExist:
        raise ValidationError("New slot not found or unavailable.")

    if new_slot.is_booked:
        raise ValidationError("The new slot is already booked.")

    if new_slot.start < timezone.now():
        raise ValidationError("Cannot reschedule to a past slot.")

    if new_slot.doctor_id != appointment.doctor_id:
        raise ValidationError("New slot must be for the same doctor.")

    # Hold the new slot
    new_slot.is_booked = True
    new_slot.save(update_fields=['is_booked'])

    # Store new slot reference and reason in the appointment
    appointment.reschedule_slot = new_slot
    appointment.reschedule_reason = reason
    appointment.save(update_fields=['reschedule_slot', 'reschedule_reason', 'updated_at'])

    return _change_status(
        appointment,
        Appointment.Status.RESCHEDULE_REQUESTED,
        patient,
        note=f"Reschedule request to {new_slot.start}. Reason: {reason}".strip()
    )


@transaction.atomic

# ─────────────────────────────────────────────
# Reschedule reason-only (patient sends reason, no new slot)
# ─────────────────────────────────────────────
@transaction.atomic
def request_reschedule_reason_only(appointment: Appointment, patient, reason: str = ""):
    """
    Patient requests rescheduling with only a reason (no new slot selected yet).
    Status → RESCHEDULE_REQUESTED. Doctor/assistant will then propose/approve new slot.
    FIX: Allows reschedule requests without requiring new_slot_id upfront.
    """
    if appointment.patient_id != patient.id:
        raise PermissionDenied("Only the patient can request rescheduling.")

    allowed_statuses = [Appointment.Status.CONFIRMED, Appointment.Status.PENDING]
    if appointment.status not in allowed_statuses:
        raise ValidationError("Rescheduling is only allowed for confirmed or pending appointments.")

    if reason:
        appointment.reschedule_reason = reason
        appointment.save(update_fields=["reschedule_reason", "updated_at"])

    return _change_status(
        appointment,
        Appointment.Status.RESCHEDULE_REQUESTED,
        patient,
        note=reason or "Patient requested reschedule",
    )


def approve_reschedule(appointment: Appointment, user):
    """
    Doctor/Assistant approves the reschedule request.
    - Old slot is freed.
    - New slot becomes the active slot.
    - Appointment moves to CONFIRMED.
    """
    if appointment.status != Appointment.Status.RESCHEDULE_REQUESTED:
        raise ValidationError("No pending reschedule request for this appointment.")

    _assert_can_manage(appointment, user)

    reschedule_slot = getattr(appointment, 'reschedule_slot', None)
    if not reschedule_slot:
        raise ValidationError("New slot was not specified.")

    # Free old slot
    old_slot = appointment.slot
    old_slot.is_booked = False
    old_slot.save(update_fields=['is_booked'])

    # Activate new slot
    appointment.slot = reschedule_slot
    appointment.reschedule_slot = None
    appointment.save(update_fields=['slot', 'reschedule_slot', 'updated_at'])

    return _change_status(appointment, Appointment.Status.CONFIRMED, user, "Reschedule approved")


@transaction.atomic
def reject_reschedule(appointment: Appointment, user, reason: str = ""):
    """
    Doctor/Assistant rejects the reschedule request.
    - New held slot is freed.
    - Appointment reverts to CONFIRMED.
    """
    if appointment.status != Appointment.Status.RESCHEDULE_REQUESTED:
        raise ValidationError("No pending reschedule request for this appointment.")

    _assert_can_manage(appointment, user)

    reschedule_slot = getattr(appointment, 'reschedule_slot', None)
    if reschedule_slot:
        reschedule_slot.is_booked = False
        reschedule_slot.save(update_fields=['is_booked'])
        appointment.reschedule_slot = None
        appointment.save(update_fields=['reschedule_slot', 'updated_at'])

    return _change_status(
        appointment, Appointment.Status.CONFIRMED, user,
        note=f"Reschedule request rejected. {reason}".strip()
    )

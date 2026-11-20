"""
CuraBook — Appointment Workflow Service
=========================================
ALL appointment status changes MUST go through AppointmentWorkflowService.
This class enforces:
  - State machine validation (via AppointmentStateMachine)
  - Permission checks (who can change what)
  - Audit logging
  - Real-time notifications
  - Atomic transactions

Usage:
    AppointmentWorkflowService.confirm(appointment, user)
    AppointmentWorkflowService.reject(appointment, user, reason="...")
    AppointmentWorkflowService.cancel(appointment, user)
    AppointmentWorkflowService.complete(appointment, user)
"""

import logging
from django.db import transaction
from django.core.exceptions import PermissionDenied

from core.exceptions import (
    BusinessLogicException,
    InvalidStateTransitionException,
    WorkplaceAccessDeniedException,
)
from .state_machine import AppointmentStateMachine

logger = logging.getLogger('curabook')


class AppointmentWorkflowService:
    """
    Central service for all appointment status transitions.
    No transition should happen outside this class.
    """

    @classmethod
    @transaction.atomic
    def confirm(cls, appointment, user):
        """
        PENDING → CONFIRMED
        Allowed by: doctor, clinic assistant, hospital assistant, hospital admin
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'CONFIRMED')
        cls._assert_can_manage(appointment, user)
        return cls._change_status(appointment, 'CONFIRMED', user, note="Appointment confirmed")

    @classmethod
    @transaction.atomic
    def reject(cls, appointment, user, reason: str = ""):
        """
        PENDING → REJECTED
        Frees the slot back on rejection.
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'REJECTED')
        cls._assert_can_manage(appointment, user)

        # Free slot
        slot = appointment.slot
        slot.is_booked = False
        slot.save(update_fields=['is_booked'])

        if reason:
            appointment.rejection_reason = reason
            appointment.save(update_fields=['rejection_reason'])

        return cls._change_status(
            appointment, 'REJECTED', user,
            note=f"Appointment rejected. {reason}".strip()
        )

    @classmethod
    @transaction.atomic
    def cancel(cls, appointment, user):
        """
        PENDING/CONFIRMED → CANCELLED
        Allowed by: patient (own appointments), doctor, assistant,
                    hospital admin (Bug #7 Fix), platform admin.
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'CANCELLED')

        is_patient   = appointment.patient_id == user.id
        is_doctor    = appointment.doctor_id == user.id
        is_assistant = cls._is_assistant_of(appointment, user)
        is_admin     = getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False)

        # Bug #7 Fix: hospital admin can cancel appointments belonging to their hospital
        is_hospital_admin = False
        if getattr(user, 'hospital_admin', False) and appointment.hospital_id:
            from hospital.models import HospitalAdmin
            is_hospital_admin = HospitalAdmin.objects.filter(
                user=user, hospital_id=appointment.hospital_id
            ).exists()

        if not (is_patient or is_doctor or is_assistant or is_admin or is_hospital_admin):
            raise WorkplaceAccessDeniedException("You do not have permission to cancel this appointment.")

        slot = appointment.slot
        slot.is_booked = False
        slot.save(update_fields=['is_booked'])

        return cls._change_status(appointment, 'CANCELLED', user, note="Appointment cancelled")

    @classmethod
    @transaction.atomic
    def revert_to_pending(cls, appointment, user):
        """
        CONFIRMED → PENDING
        Bug #7 Fix: Hospital admin can un-confirm an appointment, reverting it
        to PENDING for re-review. The slot remains booked — the appointment is
        still active and will be re-confirmed or rejected.

        Allowed by: hospital admin (for appointments in their hospital),
                    platform admin, staff.
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'PENDING')

        is_admin = getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False)

        is_hospital_admin = False
        if getattr(user, 'hospital_admin', False) and appointment.hospital_id:
            from hospital.models import HospitalAdmin
            is_hospital_admin = HospitalAdmin.objects.filter(
                user=user, hospital_id=appointment.hospital_id
            ).exists()

        if not (is_admin or is_hospital_admin):
            raise PermissionDenied(
                "Only hospital admin can revert a confirmed appointment to pending."
            )

        # Slot stays booked — appointment is still active
        return cls._change_status(
            appointment, 'PENDING', user,
            note="Appointment reverted to pending by hospital admin"
        )

    @classmethod
    @transaction.atomic
    def complete(cls, appointment, user):
        """
        CONFIRMED → COMPLETED
        Only the doctor can mark an appointment as completed.
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'COMPLETED')

        if appointment.doctor_id != user.id:
            raise PermissionDenied("Only the doctor can mark the appointment as completed.")

        return cls._change_status(appointment, 'COMPLETED', user, note="Appointment completed")

    @classmethod
    @transaction.atomic
    def mark_no_show(cls, appointment, user):
        """
        CONFIRMED → NO_SHOW
        Doctor marks patient as no-show. Frees the slot for re-use.
        POST /api/v1/appointments/{id}/no-show/
        """
        AppointmentStateMachine.validate_transition(appointment.status, 'NO_SHOW')

        if appointment.doctor_id != user.id:
            raise PermissionDenied("Only the doctor can mark the appointment as no-show.")

        # Free the slot so it can be re-booked
        slot = getattr(appointment, 'slot', None)
        if slot:
            slot.is_booked = False
            slot.save(update_fields=['is_booked'])

        return cls._change_status(
            appointment, 'NO_SHOW', user,
            note="Patient did not attend the appointment",
        )

    @classmethod
    @transaction.atomic
    def expire(cls, appointment):
        """
        System-called: auto-cancel PENDING appointments past their expiry.
        Called by Celery Beat task.
        """
        if appointment.status != 'PENDING':
            return appointment

        from django.utils import timezone
        if not (appointment.expires_at and timezone.now() > appointment.expires_at):
            return appointment

        slot = appointment.slot
        slot.is_booked = False
        slot.save(update_fields=['is_booked'])

        appointment.status = 'CANCELLED'
        appointment.save(update_fields=['status', 'updated_at'])

        cls._record_history(
            appointment=appointment,
            old_status='PENDING',
            new_status='CANCELLED',
            user=None,
            note="Appointment request expired automatically",
        )

        cls._log_audit(appointment, actor=None, new_status='CANCELLED')
        return appointment

    # ─────────────────────────────────────────────
    # Internal: status change
    # ─────────────────────────────────────────────
    @classmethod
    def _change_status(cls, appointment, new_status: str, user, note: str = ""):
        if appointment.status == new_status:
            return appointment

        # ── Race condition protection ──────────────────────────────────────
        # Re-fetch the appointment row with SELECT FOR UPDATE inside the
        # atomic transaction. Prevents two assistants/doctors from confirming
        # or rejecting the same appointment simultaneously (Bug #2).
        from appointments.models import Appointment as _Appt
        try:
            locked = _Appt.objects.select_for_update().get(pk=appointment.pk)
        except _Appt.DoesNotExist:
            from core.exceptions import BusinessLogicException
            raise BusinessLogicException(
                message="Appointment not found.",
                code="APPOINTMENT_NOT_FOUND",
            )

        # Re-validate state after acquiring lock — another request may have
        # changed it between the view call and this point.
        if locked.status != appointment.status:
            from core.exceptions import InvalidStateTransitionException
            raise InvalidStateTransitionException(
                from_status=locked.status,
                to_status=new_status,
            )

        old_status = locked.status
        locked.status = new_status
        locked.save(update_fields=['status', 'updated_at'])

        # Keep the caller's reference in sync
        appointment.status = new_status

        cls._record_history(locked, old_status, new_status, user, note)
        cls._log_audit(locked, actor=user, new_status=new_status)
        # Appointment post_save signals are the single notification source.
        # Calling _notify here as well creates duplicate realtime events.

        logger.info(
            f'[AppointmentWorkflow] #{locked.id} '
            f'{old_status} → {new_status} by user={getattr(user, "id", "system")}'
        )
        return locked

    @classmethod
    def _record_history(cls, appointment, old_status, new_status, user, note=""):
        from appointments.models import AppointmentHistory
        AppointmentHistory.objects.create(
            appointment=appointment,
            old_status=old_status or '',
            new_status=new_status,
            changed_by=user,
            note=note,
        )

    @classmethod
    def _log_audit(cls, appointment, actor, new_status: str):
        try:
            from audit.models import AuditLog
            action_map = {
                'CONFIRMED': AuditLog.Action.CONFIRM,
                'REJECTED':  AuditLog.Action.REJECT,
                'CANCELLED': AuditLog.Action.CANCEL,
                'COMPLETED': AuditLog.Action.COMPLETE,
            }
            action = action_map.get(new_status, AuditLog.Action.UPDATE)
            AuditLog.log(
                actor=actor,
                action=action,
                obj=appointment,
                new_data={"status": new_status},
                metadata={"workflow": "AppointmentWorkflowService"},
            )
        except Exception as e:
            logger.error(f'[AppointmentWorkflow] Audit log failed: {e}')

    @classmethod
    def _notify(cls, appointment, new_status: str):
        try:
            from notifications.services import notify_appointment_status
            notify_appointment_status(appointment, new_status)
        except Exception as e:
            logger.error(f'[AppointmentWorkflow] Notification failed: {e}')

    # ─────────────────────────────────────────────
    # Internal: permission helpers
    # ─────────────────────────────────────────────
    @classmethod
    def _assert_can_manage(cls, appointment, user):
        if appointment.doctor_id == user.id:
            return
        if cls._is_assistant_of(appointment, user):
            return
        if getattr(user, 'hospital_admin', False) and appointment.hospital_id:
            from hospital.models import HospitalAdmin
            if HospitalAdmin.objects.filter(
                user=user, hospital_id=appointment.hospital_id
            ).exists():
                return
        if getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False):
            return
        raise PermissionDenied("You do not have permission to manage this appointment.")

    @classmethod
    def _is_assistant_of(cls, appointment, user) -> bool:
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

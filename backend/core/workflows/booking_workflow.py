"""
CuraBook — Booking Workflow Orchestrator
==========================================
Central orchestration layer for all booking operations.
Wraps the full booking flow in a single atomic transaction:

    1. validate_slot()          — check slot exists + is available
    2. lock_slot()              — SELECT FOR UPDATE (prevents race conditions)
    3. create_appointment()     — persist the appointment as PENDING
    4. log_audit()              — structured audit trail entry
    5. send_realtime_event()    — WebSocket push to doctor/assistants
    6. queue_email()            — async email via Celery

NO business logic is allowed in ViewSets.
ViewSets call BookingWorkflowOrchestrator.execute() only.

Usage:
    workflow = BookingWorkflowOrchestrator(
        patient=request.user,
        doctor=doctor,
        slot_id=validated_data['slot'].id,
        reason=validated_data.get('reason'),
        visit_type=validated_data.get('visit_type'),
        ip_address=request.META.get('REMOTE_ADDR'),
    )
    appointment = workflow.execute()
"""

import logging
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from core.exceptions import (
    AppointmentConflictException,
    SlotUnavailableException,
    BusinessLogicException,
)

logger = logging.getLogger('curabook')


class BookingWorkflowOrchestrator:
    """
    Orchestrates the full appointment booking workflow in a single atomic transaction.
    This is the ONLY entry point for creating appointments.
    """

    def __init__(
        self,
        patient,
        doctor,
        slot_id: int,
        reason: str = None,
        visit_type: str = None,
        ip_address: str = None,
    ):
        self.patient    = patient
        self.doctor     = doctor
        self.slot_id    = slot_id
        self.reason     = reason
        self.visit_type = visit_type
        self.ip_address = ip_address

        self._slot        = None
        self._appointment = None

    @transaction.atomic
    def execute(self):
        """
        Runs the full booking workflow atomically.
        Returns the created Appointment instance.
        """
        logger.info(
            f'[BookingWorkflow] START patient={self.patient.id} '
            f'doctor={self.doctor.id} slot={self.slot_id}'
        )

        # Step 1 — Validate slot
        self._validate_slot()

        # Step 2 — Lock slot (SELECT FOR UPDATE)
        self._lock_slot()

        # Step 3 — Create appointment
        self._create_appointment()

        # Step 4 — Audit log
        self._log_audit()

        # Step 5 — Real-time event (non-blocking — errors don't abort transaction)
        self._send_realtime_event()

        # Step 6 — Queue email (Celery — non-blocking)
        self._queue_email()

        logger.info(
            f'[BookingWorkflow] SUCCESS appointment=#{self._appointment.id} '
            f'patient={self.patient.id}'
        )
        return self._appointment

    # ─────────────────────────────────────────────
    # Step 1 — Validate Slot
    # ─────────────────────────────────────────────
    def _validate_slot(self):
        from scheduling.models import GeneratedSlot

        try:
            slot = GeneratedSlot.objects.get(id=self.slot_id, is_active=True)
        except GeneratedSlot.DoesNotExist:
            raise SlotUnavailableException("Appointment not found or unavailable.")

        if slot.is_booked:
            raise AppointmentConflictException("This slot is already booked.")

        if slot.start < timezone.now():
            raise BusinessLogicException(
                message="Cannot book an appointment in the past.",
                code="SLOT_IN_PAST",
            )

        if slot.doctor_id != self.doctor.id:
            raise BusinessLogicException(
                message="This slot does not belong to this doctor.",
                code="SLOT_DOCTOR_MISMATCH",
            )

        if not slot.clinic and not slot.hospital:
            raise BusinessLogicException(
                message="Appointment must be linked to a clinic or hospital.",
                code="SLOT_NO_LOCATION",
            )

        # Store for reuse in later steps
        self._slot = slot

    # ─────────────────────────────────────────────
    # Step 2 — Lock Slot (SELECT FOR UPDATE)
    # ─────────────────────────────────────────────
    def _lock_slot(self):
        """
        Re-fetches the slot with SELECT FOR UPDATE inside the transaction.
        This is the atomic lock that prevents double booking in concurrent requests.
        Must be called AFTER _validate_slot() and INSIDE @transaction.atomic.
        """
        from scheduling.models import GeneratedSlot

        try:
            self._slot = GeneratedSlot.objects.select_for_update().get(
                id=self.slot_id,
                is_active=True,
                is_booked=False,    # Re-check inside lock
            )
        except GeneratedSlot.DoesNotExist:
            # Another request grabbed the slot between validate and lock
            raise AppointmentConflictException(
                "This slot was just booked by someone else. Please choose another slot."
            )

    # ─────────────────────────────────────────────
    # Step 3 — Create Appointment
    # ─────────────────────────────────────────────
    def _create_appointment(self):
        from appointments.models import Appointment

        self._appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=self._slot,
            clinic=self._slot.clinic,
            hospital=self._slot.hospital,
            reason=self.reason,
            visit_type=self.visit_type or Appointment.VisitType.IN_PERSON,
            status=Appointment.Status.PENDING,
            expires_at=timezone.now() + timedelta(minutes=30),
        )

        # Mark slot as booked
        self._slot.is_booked = True
        self._slot.save(update_fields=['is_booked'])

        # Record history
        from appointments.models import AppointmentHistory
        AppointmentHistory.objects.create(
            appointment=self._appointment,
            old_status='',
            new_status=Appointment.Status.PENDING,
            changed_by=self.patient,
            note="New booking request via Booking Workflow",
        )

    # ─────────────────────────────────────────────
    # Step 4 — Audit Log
    # ─────────────────────────────────────────────
    def _log_audit(self):
        try:
            from audit.models import AuditLog
            AuditLog.log(
                actor=self.patient,
                action=AuditLog.Action.BOOKING,
                obj=self._appointment,
                new_data={
                    "appointment_id": self._appointment.id,
                    "doctor_id":      self.doctor.id,
                    "slot_id":        self._slot.id,
                    "status":         "PENDING",
                    "visit_type":     self._appointment.visit_type,
                },
                metadata={"workflow": "BookingWorkflowOrchestrator"},
                ip_address=self.ip_address,
            )
        except Exception as e:
            logger.error(f'[BookingWorkflow] Audit log failed: {e}')

    # ─────────────────────────────────────────────
    # Step 5 — Real-time Event
    # ─────────────────────────────────────────────
    def _send_realtime_event(self):
        try:
            from notifications.services import notify_new_appointment
            notify_new_appointment(self._appointment)
        except Exception as e:
            logger.error(f'[BookingWorkflow] Realtime event failed: {e}')

    # ─────────────────────────────────────────────
    # Step 6 — Queue Email
    # ─────────────────────────────────────────────
    def _queue_email(self):
        try:
            from appointments.tasks import send_appointment_email
            send_appointment_email.delay(
                appointment_id=self._appointment.id,
                template='new_booking',
            )
        except Exception as e:
            logger.error(f'[BookingWorkflow] Email queue failed: {e}')

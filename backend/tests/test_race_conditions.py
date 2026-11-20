"""
CuraBook — Race Condition & Concurrent Booking Tests

Simulates concurrent DB access to verify:
  1. Only ONE patient can book a slot — others get rejected
  2. select_for_update() + transaction.atomic() prevent double booking
  3. Slot is_booked flag stays consistent
"""

import pytest
import threading
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from appointments.models import Appointment
from appointments.services import create_appointment
from tests.factories import (
    DoctorProfileFactory, PatientUserFactory,
    ClinicFactory, SlotFactory,
)


def _book(patient, doctor, slot_id, results, index):
    """Thread worker that tries to book and records success/failure."""
    try:
        with patch('appointments.signals.handle_appointment_change'):
            with patch('notifications.services._push_to_websocket'):
                appt = create_appointment(patient=patient, doctor=doctor, slot_id=slot_id)
        results[index] = ('success', appt.id)
    except Exception as e:
        results[index] = ('error', str(e))


@pytest.mark.django_db(transaction=True)   # transaction=True for real concurrency
class TestConcurrentBooking:

    def test_only_one_booking_succeeds_per_slot(self):
        """
        3 patients try to book the same slot simultaneously.
        Exactly 1 should succeed, 2 should fail.
        """
        profile  = DoctorProfileFactory()
        clinic   = ClinicFactory(owner=profile)
        slot     = SlotFactory(
            doctor=clinic.owner.user,
            clinic=clinic,
            start=timezone.now() + timedelta(hours=5),
            end=timezone.now()   + timedelta(hours=5, minutes=30),
        )

        patients = [PatientUserFactory() for _ in range(3)]
        results  = [None] * 3
        threads  = [
            threading.Thread(
                target=_book,
                args=(p, clinic.owner.user, slot.id, results, i)
            )
            for i, p in enumerate(patients)
        ]

        # Start all threads simultaneously
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r[0] == 'success']
        errors    = [r for r in results if r[0] == 'error']

        assert len(successes) == 1, f"Expected 1 success, got {len(successes)}: {results}"
        assert len(errors)    == 2, f"Expected 2 errors, got {len(errors)}: {results}"

        # Slot must be booked
        slot.refresh_from_db()
        assert slot.is_booked is True

        # Only 1 PENDING appointment should exist for this slot
        assert Appointment.objects.filter(slot=slot, status='PENDING').count() == 1

    def test_slot_stays_consistent_after_reject(self):
        """After rejection, slot is freed and another patient can book it."""
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(
            doctor=clinic.owner.user,
            clinic=clinic,
            start=timezone.now() + timedelta(hours=6),
            end=timezone.now()   + timedelta(hours=6, minutes=30),
        )
        patient1 = PatientUserFactory()
        patient2 = PatientUserFactory()
        doctor   = clinic.owner.user

        # Patient1 books
        with patch('appointments.signals.handle_appointment_change'):
            with patch('notifications.services._push_to_websocket'):
                appt = create_appointment(patient=patient1, doctor=doctor, slot_id=slot.id)

        # Doctor rejects
        from appointments.services import reject_appointment
        with patch('appointments.signals.handle_appointment_change'):
            reject_appointment(appt, doctor, reason='test')

        slot.refresh_from_db()
        assert slot.is_booked is False

        # Patient2 can now book
        with patch('appointments.signals.handle_appointment_change'):
            with patch('notifications.services._push_to_websocket'):
                appt2 = create_appointment(patient=patient2, doctor=doctor, slot_id=slot.id)

        assert appt2.status == Appointment.Status.PENDING

    def test_expired_slot_cannot_be_booked(self):
        """Slots in the past must be rejected."""
        from django.core.exceptions import ValidationError
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(
            doctor=clinic.owner.user,
            clinic=clinic,
            start=timezone.now() - timedelta(hours=2),
            end=timezone.now()   - timedelta(hours=1, minutes=30),
        )
        patient = PatientUserFactory()

        with pytest.raises(ValidationError, match='الماضي'):
            create_appointment(patient=patient, doctor=clinic.owner.user, slot_id=slot.id)

    def test_booking_creates_exactly_one_history_record(self):
        """Each booking must create exactly one AppointmentHistory entry."""
        from appointments.models import AppointmentHistory
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(
            doctor=clinic.owner.user,
            clinic=clinic,
            start=timezone.now() + timedelta(hours=7),
            end=timezone.now()   + timedelta(hours=7, minutes=30),
        )
        patient = PatientUserFactory()

        with patch('appointments.signals.handle_appointment_change'):
            with patch('notifications.services._push_to_websocket'):
                appt = create_appointment(patient=patient, doctor=clinic.owner.user, slot_id=slot.id)

        history = AppointmentHistory.objects.filter(appointment=appt)
        assert history.count() == 1
        assert history.first().new_status == Appointment.Status.PENDING

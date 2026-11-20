"""
CuraBook — Tests: Celery Tasks

Tests the async tasks run synchronously (no worker needed).
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from appointments.models import Appointment
from appointments.tasks import expire_pending_appointments, send_appointment_reminders
from tests.factories import (
    AppointmentFactory, SlotFactory, ClinicFactory, DoctorProfileFactory,
    PatientUserFactory,
)


@pytest.mark.django_db
class TestExpireTask:

    def test_cancels_expired_pending_appointments(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(doctor=profile.user, clinic=clinic)
        appt    = AppointmentFactory(
            doctor=profile.user, slot=slot, clinic=clinic,
            status='PENDING',
            expires_at=timezone.now() - timedelta(minutes=5),
        )

        with patch('notifications.services._push_to_websocket'):
            result = expire_pending_appointments()

        appt.refresh_from_db()
        assert appt.status == Appointment.Status.CANCELLED
        assert result['expired'] >= 1

    def test_does_not_cancel_non_expired(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(doctor=profile.user, clinic=clinic)
        appt    = AppointmentFactory(
            doctor=profile.user, slot=slot, clinic=clinic,
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=20),
        )

        with patch('notifications.services._push_to_websocket'):
            expire_pending_appointments()

        appt.refresh_from_db()
        assert appt.status == Appointment.Status.PENDING

    def test_does_not_cancel_confirmed(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(doctor=profile.user, clinic=clinic)
        appt    = AppointmentFactory(
            doctor=profile.user, slot=slot, clinic=clinic,
            status='CONFIRMED',
            expires_at=timezone.now() - timedelta(minutes=5),
        )

        with patch('notifications.services._push_to_websocket'):
            expire_pending_appointments()

        appt.refresh_from_db()
        assert appt.status == Appointment.Status.CONFIRMED


@pytest.mark.django_db
class TestReminderTask:

    def test_sends_reminder_for_upcoming_confirmed(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        # Slot starting in ~24 hours
        slot = SlotFactory(
            doctor=profile.user, clinic=clinic,
            start=timezone.now() + timedelta(hours=24),
            end=timezone.now()   + timedelta(hours=24, minutes=30),
        )
        appt = AppointmentFactory(
            doctor=profile.user, slot=slot, clinic=clinic,
            status='CONFIRMED',
        )

        with patch('notifications.services.send_notification') as mock_notif:
            result = send_appointment_reminders()

        assert mock_notif.called
        assert result['reminders_sent'] >= 1

    def test_does_not_send_for_pending(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot = SlotFactory(
            doctor=profile.user, clinic=clinic,
            start=timezone.now() + timedelta(hours=24),
            end=timezone.now()   + timedelta(hours=24, minutes=30),
        )
        AppointmentFactory(
            doctor=profile.user, slot=slot, clinic=clinic,
            status='PENDING',
        )

        with patch('notifications.services.send_notification') as mock_notif:
            result = send_appointment_reminders()

        assert result['reminders_sent'] == 0

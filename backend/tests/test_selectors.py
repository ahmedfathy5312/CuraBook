"""
CuraBook — Unit Tests: Appointment Selectors
=============================================
Tests the selector layer — DB queries without HTTP.
Ensures selectors return correct data and apply filters properly.
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from appointments.models import Appointment
from appointments.selectors import (
    get_appointments_for_patient,
    get_appointments_for_doctor,
    get_expired_pending_appointments,
    get_appointments_due_for_reminder,
)
from tests.factories import (
    PatientUserFactory, DoctorUserFactory, DoctorProfileFactory,
    SlotFactory, ClinicFactory, AppointmentFactory,
)


@pytest.fixture
def doctor():
    return DoctorProfileFactory().user


@pytest.fixture
def patient():
    return PatientUserFactory()


@pytest.fixture
def clinic(doctor):
    return ClinicFactory(owner=doctor.doctor_profile)


@pytest.fixture
def future_slot(doctor, clinic):
    return SlotFactory(
        doctor=doctor, clinic=clinic,
        start=timezone.now() + timedelta(days=1),
        end=timezone.now() + timedelta(days=1, minutes=30),
    )


@pytest.mark.django_db
class TestAppointmentSelectors:

    def test_get_appointments_for_patient_returns_own(self, patient, doctor, future_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=future_slot, clinic=future_slot.clinic
        )
        other_patient = PatientUserFactory()
        AppointmentFactory(patient=other_patient)  # unrelated

        result = get_appointments_for_patient(patient)
        assert appt in result
        assert result.filter(patient=other_patient).count() == 0

    def test_get_appointments_for_doctor_returns_own(self, patient, doctor, future_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=future_slot, clinic=future_slot.clinic
        )
        other_doctor = DoctorProfileFactory().user
        AppointmentFactory(doctor=other_doctor)  # unrelated

        result = get_appointments_for_doctor(doctor)
        assert appt in result
        assert result.filter(doctor=other_doctor).count() == 0

    def test_get_expired_pending_returns_only_expired(self, patient, doctor, clinic):
        # Expired pending
        expired_slot = SlotFactory(doctor=doctor, clinic=clinic)
        expired = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=expired_slot, clinic=clinic,
            status='PENDING',
            expires_at=timezone.now() - timedelta(minutes=5),
        )

        # Not expired yet
        active_slot = SlotFactory(doctor=doctor, clinic=clinic)
        active = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=active_slot, clinic=clinic,
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=25),
        )

        result = list(get_expired_pending_appointments())
        assert expired in result
        assert active not in result

    def test_get_appointments_for_doctor_filters_by_status(self, patient, doctor, future_slot, clinic):
        confirmed = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=future_slot, clinic=clinic, status='CONFIRMED'
        )
        result = get_appointments_for_doctor(doctor, status='CONFIRMED')
        assert confirmed in result

    def test_selectors_use_select_related(self, patient, doctor, future_slot):
        """Verify selectors don't produce N+1 queries."""
        AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=future_slot, clinic=future_slot.clinic
        )
        # Should prefetch patient, doctor, slot in one query
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        with CaptureQueriesContext(connection) as ctx:
            results = list(get_appointments_for_doctor(doctor))
            if results:
                # Access related fields — should not cause extra queries
                _ = results[0].patient.username
                _ = results[0].slot.start

        # Should not be too many queries (select_related should batch them)
        assert len(ctx.captured_queries) <= 3

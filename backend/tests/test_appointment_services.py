"""
CuraBook — Unit Tests: Appointment Services

Tests the business logic layer directly — no HTTP involved.
Covers: create, confirm, reject, cancel, complete, expire, double-booking.
"""

import pytest
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied
from datetime import timedelta
from unittest.mock import patch

from appointments.models import Appointment, AppointmentHistory
from appointments.services import (
    create_appointment,
    confirm_appointment,
    reject_appointment,
    cancel_appointment,
    complete_appointment,
    expire_appointment,
)
from tests.factories import (
    PatientUserFactory, DoctorUserFactory, SlotFactory,
    ClinicFactory, DoctorProfileFactory,
    AssistantProfileFactory, ClinicAssistantFactory,
)


# ─────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────
@pytest.fixture
def doctor():
    profile = DoctorProfileFactory()
    return profile.user


@pytest.fixture
def patient():
    return PatientUserFactory()


@pytest.fixture
def clinic(doctor):
    return ClinicFactory(owner=doctor.doctor_profile)


@pytest.fixture
def slot(doctor, clinic):
    return SlotFactory(
        doctor=doctor,
        clinic=clinic,
        start=timezone.now() + timedelta(hours=2),
        end=timezone.now() + timedelta(hours=2, minutes=30),
    )


@pytest.fixture
def pending_appointment(patient, doctor, slot):
    """Create a real pending appointment via the service."""
    with patch('appointments.signals.handle_appointment_change'):
        return create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)


# ─────────────────────────────────────────────────────
# Create Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestCreateAppointment:

    def test_creates_pending_appointment(self, patient, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            appt = create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

        assert appt.status == Appointment.Status.PENDING
        assert appt.patient == patient
        assert appt.doctor  == doctor
        assert appt.slot    == slot

    def test_slot_is_marked_booked(self, patient, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

        slot.refresh_from_db()
        assert slot.is_booked is True

    def test_history_recorded(self, patient, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            appt = create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

        history = AppointmentHistory.objects.filter(appointment=appt)
        assert history.exists()
        assert history.first().new_status == Appointment.Status.PENDING

    def test_expires_at_is_set(self, patient, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            appt = create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

        assert appt.expires_at is not None
        assert appt.expires_at > timezone.now()

    def test_raises_if_slot_already_booked(self, patient, doctor, slot):
        slot.is_booked = True
        slot.save()

        with pytest.raises(ValidationError, match='محجوز'):
            create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

    def test_raises_if_slot_in_past(self, patient, doctor, clinic):
        past_slot = SlotFactory(
            doctor=doctor,
            clinic=clinic,
            start=timezone.now() - timedelta(hours=1),
            end=timezone.now() - timedelta(minutes=30),
        )
        with pytest.raises(ValidationError, match='الماضي'):
            create_appointment(patient=patient, doctor=doctor, slot_id=past_slot.id)

    def test_raises_if_slot_belongs_to_different_doctor(self, patient, doctor, slot):
        other_doctor = DoctorUserFactory()
        with pytest.raises(ValidationError, match='الطبيب'):
            create_appointment(patient=patient, doctor=other_doctor, slot_id=slot.id)

    def test_prevents_double_booking(self, patient, doctor, slot):
        """Two concurrent requests for the same slot — only one should succeed."""
        other_patient = PatientUserFactory()

        with patch('appointments.signals.handle_appointment_change'):
            create_appointment(patient=patient, doctor=doctor, slot_id=slot.id)

        with pytest.raises(ValidationError):
            create_appointment(patient=other_patient, doctor=doctor, slot_id=slot.id)


# ─────────────────────────────────────────────────────
# Confirm Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestConfirmAppointment:

    def test_doctor_can_confirm(self, pending_appointment, doctor):
        with patch('appointments.signals.handle_appointment_change'):
            appt = confirm_appointment(pending_appointment, doctor)

        assert appt.status == Appointment.Status.CONFIRMED

    def test_assistant_can_confirm(self, pending_appointment, clinic):
        assistant_profile = AssistantProfileFactory()
        ClinicAssistantFactory(assistant=assistant_profile, clinic=clinic)
        assistant = assistant_profile.user

        with patch('appointments.signals.handle_appointment_change'):
            appt = confirm_appointment(pending_appointment, assistant)

        assert appt.status == Appointment.Status.CONFIRMED

    def test_patient_cannot_confirm(self, pending_appointment, patient):
        with pytest.raises(PermissionDenied):
            confirm_appointment(pending_appointment, patient)

    def test_cannot_confirm_if_not_pending(self, pending_appointment, doctor):
        pending_appointment.status = Appointment.Status.CONFIRMED
        pending_appointment.save()

        with pytest.raises(ValidationError):
            confirm_appointment(pending_appointment, doctor)

    def test_history_recorded_on_confirm(self, pending_appointment, doctor):
        with patch('appointments.signals.handle_appointment_change'):
            confirm_appointment(pending_appointment, doctor)

        history = AppointmentHistory.objects.filter(
            appointment=pending_appointment,
            new_status=Appointment.Status.CONFIRMED
        )
        assert history.exists()


# ─────────────────────────────────────────────────────
# Reject Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestRejectAppointment:

    def test_doctor_can_reject(self, pending_appointment, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            appt = reject_appointment(pending_appointment, doctor, reason='لا يوجد وقت')

        assert appt.status == Appointment.Status.REJECTED
        assert appt.rejection_reason == 'لا يوجد وقت'

    def test_slot_freed_on_reject(self, pending_appointment, doctor, slot):
        with patch('appointments.signals.handle_appointment_change'):
            reject_appointment(pending_appointment, doctor)

        slot.refresh_from_db()
        assert slot.is_booked is False

    def test_stranger_cannot_reject(self, pending_appointment):
        stranger = PatientUserFactory()
        with pytest.raises(PermissionDenied):
            reject_appointment(pending_appointment, stranger)


# ─────────────────────────────────────────────────────
# Cancel Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestCancelAppointment:

    def test_patient_can_cancel_pending(self, pending_appointment, patient, slot):
        with patch('appointments.signals.handle_appointment_change'):
            appt = cancel_appointment(pending_appointment, patient)

        assert appt.status == Appointment.Status.CANCELLED
        slot.refresh_from_db()
        assert slot.is_booked is False

    def test_doctor_can_cancel(self, pending_appointment, doctor):
        with patch('appointments.signals.handle_appointment_change'):
            appt = cancel_appointment(pending_appointment, doctor)

        assert appt.status == Appointment.Status.CANCELLED

    def test_cannot_cancel_completed(self, pending_appointment, patient):
        pending_appointment.status = Appointment.Status.COMPLETED
        pending_appointment.save()

        with pytest.raises(ValidationError):
            cancel_appointment(pending_appointment, patient)

    def test_stranger_cannot_cancel(self, pending_appointment):
        stranger = PatientUserFactory()
        with pytest.raises(PermissionDenied):
            cancel_appointment(pending_appointment, stranger)


# ─────────────────────────────────────────────────────
# Complete Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestCompleteAppointment:

    def test_doctor_can_complete_confirmed(self, pending_appointment, doctor):
        pending_appointment.status = Appointment.Status.CONFIRMED
        pending_appointment.save()

        with patch('appointments.signals.handle_appointment_change'):
            appt = complete_appointment(pending_appointment, doctor)

        assert appt.status == Appointment.Status.COMPLETED

    def test_cannot_complete_pending(self, pending_appointment, doctor):
        with pytest.raises(ValidationError):
            complete_appointment(pending_appointment, doctor)

    def test_patient_cannot_complete(self, pending_appointment, patient):
        pending_appointment.status = Appointment.Status.CONFIRMED
        pending_appointment.save()

        with pytest.raises(PermissionDenied):
            complete_appointment(pending_appointment, patient)


# ─────────────────────────────────────────────────────
# Expire Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestExpireAppointment:

    def test_expires_overdue_pending(self, pending_appointment, slot):
        pending_appointment.expires_at = timezone.now() - timedelta(minutes=1)
        pending_appointment.save()

        expire_appointment(pending_appointment)

        pending_appointment.refresh_from_db()
        assert pending_appointment.status == Appointment.Status.CANCELLED

        slot.refresh_from_db()
        assert slot.is_booked is False

    def test_does_not_expire_if_not_overdue(self, pending_appointment):
        expire_appointment(pending_appointment)

        pending_appointment.refresh_from_db()
        assert pending_appointment.status == Appointment.Status.PENDING

    def test_does_not_expire_confirmed(self, pending_appointment):
        pending_appointment.status     = Appointment.Status.CONFIRMED
        pending_appointment.expires_at = timezone.now() - timedelta(minutes=1)
        pending_appointment.save()

        expire_appointment(pending_appointment)

        pending_appointment.refresh_from_db()
        assert pending_appointment.status == Appointment.Status.CONFIRMED

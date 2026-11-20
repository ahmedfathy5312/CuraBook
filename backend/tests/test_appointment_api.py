"""
CuraBook — API Tests: Appointments Endpoint

Tests full HTTP cycle: auth → request → response → DB state.
Covers role-based access, booking flow, status transitions.
"""

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from unittest.mock import patch

from appointments.models import Appointment
from tests.factories import (
    PatientUserFactory, DoctorUserFactory,
    DoctorProfileFactory, ClinicFactory, SlotFactory,
    AssistantProfileFactory, AssistantUserFactory, ClinicAssistantFactory,
    HospitalAssistantFactory,
    HospitalAdminUserFactory, HospitalFactory, HospitalAdminFactory,
    AppointmentFactory,
)


# ─────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────
def auth_client(user) -> APIClient:
    """Return an APIClient authenticated as `user` via JWT."""
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
    return client


LIST_URL   = '/api/v1/appointments/'
DETAIL_URL = lambda pk: f'/api/v1/appointments/{pk}/'
ACTION_URL = lambda pk, action: f'/api/v1/appointments/{pk}/{action}/'


# ─────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────
@pytest.fixture
def doctor_profile():
    return DoctorProfileFactory()

@pytest.fixture
def doctor(doctor_profile):
    return doctor_profile.user

@pytest.fixture
def clinic(doctor_profile):
    return ClinicFactory(owner=doctor_profile)

@pytest.fixture
def patient():
    return PatientUserFactory()

@pytest.fixture
def slot(doctor, clinic):
    return SlotFactory(
        doctor=doctor,
        clinic=clinic,
        start=timezone.now() + timedelta(hours=3),
        end=timezone.now() + timedelta(hours=3, minutes=30),
    )

@pytest.fixture
def pending_appt(patient, doctor, slot, clinic):
    return AppointmentFactory(
        patient=patient, doctor=doctor,
        slot=slot, clinic=clinic,
    )


# ─────────────────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestAuth:

    def test_unauthenticated_request_rejected(self):
        client = APIClient()
        resp = client.get(LIST_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_patient_can_list(self, patient):
        client = auth_client(patient)
        resp = client.get(LIST_URL)
        assert resp.status_code == status.HTTP_200_OK


# ─────────────────────────────────────────────────────
# Patient: Book Appointment
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestBookAppointment:

    def test_patient_books_successfully(self, patient, doctor, slot, clinic):
        client = auth_client(patient)

        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(LIST_URL, {
                'doctor':     doctor.id,
                'slot':       slot.id,
                'visit_type': 'IN_PERSON',
            })

        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['status'] == 'PENDING'
        assert data['patient'] == patient.id

    def test_doctor_cannot_book(self, doctor, slot):
        client = auth_client(doctor)
        resp = client.post(LIST_URL, {'doctor': doctor.id, 'slot': slot.id})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_book_already_booked_slot(self, patient, doctor, slot, clinic):
        slot.is_booked = True
        slot.save()
        client = auth_client(patient)

        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(LIST_URL, {'doctor': doctor.id, 'slot': slot.id})

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_book_past_slot(self, patient, doctor, clinic):
        past_slot = SlotFactory(
            doctor=doctor, clinic=clinic,
            start=timezone.now() - timedelta(hours=1),
            end=timezone.now() - timedelta(minutes=30),
        )
        client = auth_client(patient)
        resp = client.post(LIST_URL, {'doctor': doctor.id, 'slot': past_slot.id})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────
# Data Isolation — role-based queryset
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestDataIsolation:

    def test_patient_sees_only_own_appointments(self, pending_appt, patient):
        other_patient = PatientUserFactory()
        other_clinic  = ClinicFactory()
        other_slot    = SlotFactory(clinic=other_clinic)
        AppointmentFactory(patient=other_patient, slot=other_slot, clinic=other_clinic)

        client = auth_client(patient)
        resp = client.get(LIST_URL)

        ids = [a['id'] for a in resp.json()['results']]
        assert pending_appt.id in ids
        assert all(
            Appointment.objects.get(id=i).patient_id == patient.id
            for i in ids
        )

    def test_doctor_sees_only_own_appointments(self, pending_appt, doctor):
        other_doctor_profile = DoctorProfileFactory()
        other_clinic  = ClinicFactory(owner=other_doctor_profile)
        other_slot    = SlotFactory(doctor=other_doctor_profile.user, clinic=other_clinic)
        AppointmentFactory(doctor=other_doctor_profile.user, slot=other_slot, clinic=other_clinic)

        client = auth_client(doctor)
        resp = client.get(LIST_URL)

        ids = [a['id'] for a in resp.json()['results']]
        assert all(
            Appointment.objects.get(id=i).doctor_id == doctor.id
            for i in ids
        )

    def test_assistant_sees_all_clinic_appointments(self, pending_appt, clinic):
        """Assistant sees ALL appointments across their assigned clinics."""
        assistant_profile = AssistantProfileFactory()
        ClinicAssistantFactory(assistant=assistant_profile, clinic=clinic)
        assistant = assistant_profile.user

        client = auth_client(assistant)
        resp = client.get(LIST_URL)

        ids = [a['id'] for a in resp.json()['results']]
        assert pending_appt.id in ids

    def test_assistant_sees_all_hospital_appointments(self):
        """Assistant sees appointments for every active hospital assignment."""
        hospital = HospitalFactory()
        doctor = DoctorUserFactory()
        slot = SlotFactory(doctor=doctor, clinic=None, hospital=hospital)
        appt = AppointmentFactory(doctor=doctor, slot=slot, clinic=None, hospital=hospital)
        assistant_user = AssistantUserFactory()
        assistant_profile = assistant_user.assistant_profile
        HospitalAssistantFactory(assistant=assistant_profile, hospital=hospital)

        client = auth_client(assistant_user)
        resp = client.get(LIST_URL)

        payload = resp.json()
        rows = payload.get('results') or payload.get('data') or []
        ids = [a['id'] for a in rows]
        assert appt.id in ids


# ─────────────────────────────────────────────────────
# Confirm
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestConfirmAPI:

    def test_doctor_confirms(self, pending_appt, doctor):
        client = auth_client(doctor)
        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(ACTION_URL(pending_appt.id, 'confirm'))

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['status'] == 'CONFIRMED'

    def test_assistant_confirms(self, pending_appt, clinic):
        assistant_profile = AssistantProfileFactory()
        ClinicAssistantFactory(assistant=assistant_profile, clinic=clinic)

        client = auth_client(assistant_profile.user)
        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(ACTION_URL(pending_appt.id, 'confirm'))

        assert resp.status_code == status.HTTP_200_OK

    def test_patient_cannot_confirm(self, pending_appt, patient):
        client = auth_client(patient)
        resp = client.post(ACTION_URL(pending_appt.id, 'confirm'))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ─────────────────────────────────────────────────────
# Reject
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestRejectAPI:

    def test_doctor_rejects_with_reason(self, pending_appt, doctor):
        client = auth_client(doctor)
        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(
                ACTION_URL(pending_appt.id, 'reject'),
                {'reason': 'مشغول'}
            )

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['status'] == 'REJECTED'

        pending_appt.refresh_from_db()
        assert pending_appt.rejection_reason == 'مشغول'

    def test_slot_freed_after_reject(self, pending_appt, doctor, slot):
        client = auth_client(doctor)
        with patch('appointments.signals.handle_appointment_change'):
            client.post(ACTION_URL(pending_appt.id, 'reject'))

        slot.refresh_from_db()
        assert slot.is_booked is False


# ─────────────────────────────────────────────────────
# Cancel
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestCancelAPI:

    def test_patient_cancels(self, pending_appt, patient):
        client = auth_client(patient)
        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(ACTION_URL(pending_appt.id, 'cancel'))

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['status'] == 'CANCELLED'

    def test_cannot_cancel_completed(self, pending_appt, patient):
        pending_appt.status = Appointment.Status.COMPLETED
        pending_appt.save()

        client = auth_client(patient)
        resp = client.post(ACTION_URL(pending_appt.id, 'cancel'))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────
# Complete
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestCompleteAPI:

    def test_doctor_completes_confirmed(self, pending_appt, doctor):
        pending_appt.status = Appointment.Status.CONFIRMED
        pending_appt.save()

        client = auth_client(doctor)
        with patch('appointments.signals.handle_appointment_change'):
            resp = client.post(ACTION_URL(pending_appt.id, 'complete'))

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['status'] == 'COMPLETED'

    def test_patient_cannot_complete(self, pending_appt, patient):
        pending_appt.status = Appointment.Status.CONFIRMED
        pending_appt.save()

        client = auth_client(patient)
        resp = client.post(ACTION_URL(pending_appt.id, 'complete'))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

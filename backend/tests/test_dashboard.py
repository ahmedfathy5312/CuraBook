"""
CuraBook — Tests: Dashboard APIs

Tests all 4 dashboard endpoints with correct role access.
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import (
    DoctorProfileFactory, PatientUserFactory,
    AssistantProfileFactory, ClinicAssistantFactory,
    HospitalAdminUserFactory, HospitalAdminFactory,
    HospitalFactory, ClinicFactory, AppointmentFactory, SlotFactory,
)


def auth_client(user) -> APIClient:
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token)}')
    return client


# ─────────────────────────────────────────────────────
# Admin Dashboard
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestAdminDashboard:
    URL = '/api/v1/analytics/admin/'

    def test_admin_can_access(self):
        from tests.factories import UserFactory
        admin = UserFactory(is_staff=True, is_superuser=True)
        resp = auth_client(admin).get(self.URL)
        assert resp.status_code == 200

    def test_non_admin_denied(self):
        patient = PatientUserFactory()
        resp = auth_client(patient).get(self.URL)
        assert resp.status_code == 403

    def test_response_has_expected_keys(self):
        from tests.factories import UserFactory
        admin = UserFactory(is_staff=True, is_superuser=True)
        data = auth_client(admin).get(self.URL).json()

        expected = [
            'total_users', 'total_doctors', 'total_patients',
            'total_hospitals', 'total_clinics',
            'appointments_total', 'appointments_pending',
        ]
        for key in expected:
            assert key in data, f'Missing key: {key}'


# ─────────────────────────────────────────────────────
# Doctor Dashboard
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestDoctorDashboard:
    URL = '/api/v1/analytics/doctor/'

    def test_doctor_can_access(self):
        profile = DoctorProfileFactory()
        resp = auth_client(profile.user).get(self.URL)
        assert resp.status_code == 200

    def test_patient_denied(self):
        patient = PatientUserFactory()
        resp = auth_client(patient).get(self.URL)
        assert resp.status_code == 403

    def test_shows_own_appointments_count(self):
        profile = DoctorProfileFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(doctor=profile.user, clinic=clinic)
        AppointmentFactory(doctor=profile.user, slot=slot, clinic=clinic)

        data = auth_client(profile.user).get(self.URL).json()
        assert data['appointments_total'] >= 1

    def test_upcoming_appointments_in_response(self):
        profile = DoctorProfileFactory()
        data = auth_client(profile.user).get(self.URL).json()
        assert 'upcoming_appointments' in data


# ─────────────────────────────────────────────────────
# Assistant Dashboard
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestAssistantDashboard:
    URL = '/api/v1/analytics/assistant/'

    def test_assistant_can_access(self):
        ap = AssistantProfileFactory()
        resp = auth_client(ap.user).get(self.URL)
        assert resp.status_code == 200

    def test_doctor_denied(self):
        profile = DoctorProfileFactory()
        resp = auth_client(profile.user).get(self.URL)
        assert resp.status_code == 403

    def test_sees_all_clinic_appointments(self):
        """Assistant sees appointments from ALL their assigned clinics."""
        ap      = AssistantProfileFactory()
        clinic1 = ClinicFactory()
        clinic2 = ClinicFactory()

        ClinicAssistantFactory(assistant=ap, clinic=clinic1)
        ClinicAssistantFactory(assistant=ap, clinic=clinic2)

        slot1 = SlotFactory(clinic=clinic1, doctor=clinic1.owner.user)
        slot2 = SlotFactory(clinic=clinic2, doctor=clinic2.owner.user)
        a1 = AppointmentFactory(slot=slot1, clinic=clinic1, doctor=clinic1.owner.user)
        a2 = AppointmentFactory(slot=slot2, clinic=clinic2, doctor=clinic2.owner.user)

        data = auth_client(ap.user).get(self.URL).json()
        assert data['appointments_total'] >= 2
        assert data['managed_clinics'] == 2

    def test_pending_appointments_surfaced(self):
        ap     = AssistantProfileFactory()
        clinic = ClinicFactory()
        ClinicAssistantFactory(assistant=ap, clinic=clinic)
        slot   = SlotFactory(clinic=clinic, doctor=clinic.owner.user)
        AppointmentFactory(slot=slot, clinic=clinic, doctor=clinic.owner.user, status='PENDING')

        data = auth_client(ap.user).get(self.URL).json()
        assert len(data['pending_appointments']) >= 1


# ─────────────────────────────────────────────────────
# Hospital Dashboard
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestHospitalDashboard:
    URL = '/api/v1/analytics/hospital/'

    def test_hospital_admin_can_access(self):
        admin    = HospitalAdminUserFactory()
        hospital = HospitalFactory()
        HospitalAdminFactory(user=admin, hospital=hospital)

        resp = auth_client(admin).get(self.URL)
        assert resp.status_code == 200

    def test_patient_denied(self):
        patient = PatientUserFactory()
        resp = auth_client(patient).get(self.URL)
        assert resp.status_code == 403

    def test_response_has_hospital_keys(self):
        admin    = HospitalAdminUserFactory()
        hospital = HospitalFactory()
        HospitalAdminFactory(user=admin, hospital=hospital)

        data = auth_client(admin).get(self.URL).json()
        expected = ['appointments_total', 'total_doctors', 'total_departments']
        for key in expected:
            assert key in data

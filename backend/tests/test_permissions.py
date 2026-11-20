"""
CuraBook — Unit Tests: Permission Policies
==========================================
Tests object-level permission logic without HTTP.
Target: AppointmentPolicy, ClinicPolicy, HospitalPolicy, UserProfilePolicy.
"""

import pytest
from unittest.mock import MagicMock, patch
from rest_framework.test import APIRequestFactory

from core.permissions.policies.permissions import (
    AppointmentPolicy,
    ClinicPolicy,
    HospitalPolicy,
    UserProfilePolicy,
    NotificationPolicy,
    ReviewPolicy,
)
from tests.factories import (
    DoctorUserFactory,
    PatientUserFactory,
    AssistantUserFactory,
    HospitalAdminUserFactory,
    DoctorProfileFactory,
    AssistantProfileFactory,
    ClinicFactory,
    ClinicAssistantFactory,
    HospitalFactory,
    AppointmentFactory,
    SlotFactory,
)

factory = APIRequestFactory()


def _make_request(user, method='GET'):
    req = factory.get('/') if method == 'GET' else factory.post('/')
    req.user = user
    return req


# ─────────────────────────────────────────────────────
# AppointmentPolicy
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestAppointmentPolicy:
    policy = AppointmentPolicy()

    def test_patient_can_access_own_appointment(self):
        patient = PatientUserFactory()
        appt = AppointmentFactory(patient=patient)
        req = _make_request(patient)
        assert self.policy.has_object_permission(req, None, appt) is True

    def test_patient_cannot_access_other_appointment(self):
        patient1 = PatientUserFactory()
        patient2 = PatientUserFactory()
        appt = AppointmentFactory(patient=patient1)
        req = _make_request(patient2)
        assert self.policy.has_object_permission(req, None, appt) is False

    def test_doctor_can_access_own_appointment(self):
        profile = DoctorProfileFactory()
        doctor = profile.user
        slot = SlotFactory(doctor=doctor)
        appt = AppointmentFactory(doctor=doctor, slot=slot, clinic=slot.clinic)
        req = _make_request(doctor)
        assert self.policy.has_object_permission(req, None, appt) is True

    def test_doctor_cannot_access_other_doctor_appointment(self):
        other_profile = DoctorProfileFactory()
        other_doctor = other_profile.user
        appt = AppointmentFactory()  # different doctor
        req = _make_request(other_doctor)
        # other_doctor.id != appt.doctor_id → False
        assert self.policy.has_object_permission(req, None, appt) is False

    def test_platform_admin_can_access_any(self):
        admin = PatientUserFactory()
        admin.is_platform_admin = True
        appt = AppointmentFactory()
        req = _make_request(admin)
        assert self.policy.has_object_permission(req, None, appt) is True

    def test_unauthenticated_blocked_at_view_level(self):
        user = MagicMock()
        user.is_authenticated = False
        req = _make_request(user)
        assert self.policy.has_permission(req, None) is False


# ─────────────────────────────────────────────────────
# ClinicPolicy
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestClinicPolicy:
    policy = ClinicPolicy()

    def test_safe_methods_allowed_for_any_authenticated(self):
        patient = PatientUserFactory()
        profile = DoctorProfileFactory()
        clinic = ClinicFactory(owner=profile)
        req = _make_request(patient, method='GET')
        assert self.policy.has_object_permission(req, None, clinic) is True

    def test_doctor_can_mutate_own_clinic(self):
        profile = DoctorProfileFactory()
        clinic = ClinicFactory(owner=profile)
        req = factory.delete('/')
        req.user = profile.user
        req.method = 'DELETE'
        assert self.policy.has_object_permission(req, None, clinic) is True

    def test_platform_admin_full_access(self):
        admin = PatientUserFactory()
        admin.is_platform_admin = True
        clinic = ClinicFactory()
        req = factory.delete('/')
        req.user = admin
        req.method = 'DELETE'
        assert self.policy.has_object_permission(req, None, clinic) is True


# ─────────────────────────────────────────────────────
# UserProfilePolicy
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestUserProfilePolicy:
    policy = UserProfilePolicy()

    def test_user_can_access_own_profile(self):
        profile = DoctorProfileFactory()
        req = _make_request(profile.user)
        assert self.policy.has_object_permission(req, None, profile) is True

    def test_user_cannot_access_another_profile(self):
        profile1 = DoctorProfileFactory()
        profile2 = DoctorProfileFactory()
        req = _make_request(profile1.user)
        assert self.policy.has_object_permission(req, None, profile2) is False

    def test_platform_admin_can_access_any_profile(self):
        admin = PatientUserFactory()
        admin.is_platform_admin = True
        profile = DoctorProfileFactory()
        req = _make_request(admin)
        assert self.policy.has_object_permission(req, None, profile) is True


# ─────────────────────────────────────────────────────
# NotificationPolicy
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestNotificationPolicy:
    policy = NotificationPolicy()

    def test_user_can_access_own_notification(self):
        from notifications.models import Notification
        user = PatientUserFactory()
        notif = Notification.objects.create(
            user=user, title='T', body='B',
            type=Notification.Type.SYSTEM,
        )
        req = _make_request(user)
        assert self.policy.has_object_permission(req, None, notif) is True

    def test_user_cannot_access_another_notification(self):
        from notifications.models import Notification
        user1 = PatientUserFactory()
        user2 = PatientUserFactory()
        notif = Notification.objects.create(
            user=user1, title='T', body='B',
            type=Notification.Type.SYSTEM,
        )
        req = _make_request(user2)
        assert self.policy.has_object_permission(req, None, notif) is False


# ─────────────────────────────────────────────────────
# ReviewPolicy
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestReviewPolicy:
    policy = ReviewPolicy()

    def test_safe_methods_allowed_for_any(self):
        from reviews.models import Review
        profile = DoctorProfileFactory()
        patient = PatientUserFactory()
        review = MagicMock()
        review.patient_id = patient.id
        req = _make_request(patient, method='GET')
        assert self.policy.has_object_permission(req, None, review) is True

    def test_owner_can_delete_review(self):
        patient = PatientUserFactory()
        review = MagicMock()
        review.patient_id = patient.id
        req = factory.delete('/')
        req.user = patient
        req.method = 'DELETE'
        assert self.policy.has_object_permission(req, None, review) is True

    def test_non_owner_cannot_delete_review(self):
        patient1 = PatientUserFactory()
        patient2 = PatientUserFactory()
        review = MagicMock()
        review.patient_id = patient1.id
        req = factory.delete('/')
        req.user = patient2
        req.method = 'DELETE'
        assert self.policy.has_object_permission(req, None, review) is False

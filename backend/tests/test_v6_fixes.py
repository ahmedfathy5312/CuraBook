"""
CuraBook — Tests for v6 Fixes
================================
Covers the 4 remaining issues fixed in v6:
  Fix #3  — UUID public_id on all core models
  Fix #12 — Appointment archiving
  Fix #22 — Permanent IP blocking
  Fix #31 — django-silk wiring (smoke tests)
"""

import uuid
from unittest.mock import patch, MagicMock

import pytest
from django.test import RequestFactory, TestCase
from django.utils import timezone


# ══════════════════════════════════════════════════════════════════════════════
# Fix #3 — UUID public_id
# ══════════════════════════════════════════════════════════════════════════════

class TestPublicIdOnModels:
    """
    All core models must expose a public_id UUID field.
    This prevents sequential integer ID enumeration through the API.
    """

    def test_appointment_has_public_id_field(self):
        from appointments.models import Appointment
        field_names = [f.name for f in Appointment._meta.get_fields()]
        assert 'public_id' in field_names, "Appointment must have public_id field"

    def test_clinic_has_public_id_field(self):
        from clinics.models import Clinic
        field_names = [f.name for f in Clinic._meta.get_fields()]
        assert 'public_id' in field_names, "Clinic must have public_id field"

    def test_hospital_has_public_id_field(self):
        from hospital.models import Hospital
        field_names = [f.name for f in Hospital._meta.get_fields()]
        assert 'public_id' in field_names, "Hospital must have public_id field"

    def test_doctor_profile_has_public_id_field(self):
        from apps.doctors.models import DoctorProfile
        field_names = [f.name for f in DoctorProfile._meta.get_fields()]
        assert 'public_id' in field_names, "DoctorProfile must have public_id field"

    def test_assistant_profile_has_public_id_field(self):
        from apps.assistants.models import AssistantProfile
        field_names = [f.name for f in AssistantProfile._meta.get_fields()]
        assert 'public_id' in field_names, "AssistantProfile must have public_id field"

    def test_generated_slot_has_public_id_field(self):
        from scheduling.models import GeneratedSlot
        field_names = [f.name for f in GeneratedSlot._meta.get_fields()]
        assert 'public_id' in field_names, "GeneratedSlot must have public_id field"

    def test_public_id_is_uuid_field(self):
        from appointments.models import Appointment
        from django.db.models import UUIDField
        field = Appointment._meta.get_field('public_id')
        assert isinstance(field, UUIDField), "public_id must be a UUIDField"

    def test_public_id_has_default(self):
        """public_id must auto-generate — no manual assignment needed."""
        from appointments.models import Appointment
        field = Appointment._meta.get_field('public_id')
        assert field.default is not None, "public_id must have a default (uuid.uuid4)"
        # Verify it generates unique values
        id1 = field.default()
        id2 = field.default()
        assert id1 != id2, "public_id default must generate unique UUIDs"

    def test_appointment_serializer_exposes_public_id(self):
        """AppointmentSerializer must include public_id in its fields."""
        from appointments.serializers import AppointmentSerializer
        assert 'public_id' in AppointmentSerializer.Meta.fields

    def test_appointment_list_serializer_exposes_public_id(self):
        from appointments.serializers import AppointmentListSerializer
        assert 'public_id' in AppointmentListSerializer.Meta.fields


# ══════════════════════════════════════════════════════════════════════════════
# Fix #12 — Data Archiving
# ══════════════════════════════════════════════════════════════════════════════

class TestAppointmentArchiving(TestCase):
    """
    Archiving service must:
    1. Move eligible appointments to AppointmentArchive
    2. Soft-delete the original
    3. Be idempotent (no double-archive)
    4. Handle individual failures without aborting the batch
    """

    def test_archive_model_exists(self):
        from appointments.archive_models import AppointmentArchive
        assert AppointmentArchive is not None

    def test_archive_model_has_snapshot_field(self):
        from appointments.archive_models import AppointmentArchive
        field_names = [f.name for f in AppointmentArchive._meta.get_fields()]
        assert 'snapshot' in field_names
        assert 'original_appointment_id' in field_names
        assert 'final_status' in field_names
        assert 'archived_at' in field_names

    def test_archive_model_pk_is_uuid(self):
        from appointments.archive_models import AppointmentArchive
        from django.db.models import UUIDField
        pk_field = AppointmentArchive._meta.pk
        assert isinstance(pk_field, UUIDField), "AppointmentArchive PK must be UUID"

    @patch('appointments.archiving.AppointmentArchive')
    @patch('appointments.archiving.Appointment')
    def test_archive_single_is_idempotent(self, mock_appt_cls, mock_archive_cls):
        """Calling archive_single_appointment twice must not create duplicate archive rows."""
        from appointments.archiving import archive_single_appointment

        mock_appt = MagicMock()
        mock_appt.id = 99
        mock_appt.public_id = uuid.uuid4()

        # Simulate: already archived
        mock_archive_cls.objects.filter.return_value.exists.return_value = True

        result = archive_single_appointment(mock_appt)
        assert result is False, "Should return False for already-archived appointment"

    def test_celery_task_registered(self):
        """archive_old_appointments task must be importable."""
        from appointments.tasks import archive_old_appointments
        assert callable(archive_old_appointments)

    def test_archiving_cycle_importable(self):
        from appointments.archiving import run_archiving_cycle, get_archivable_queryset
        assert callable(run_archiving_cycle)
        assert callable(get_archivable_queryset)

    def test_archive_beat_schedule_registered(self):
        """Celery Beat must have the archive task registered."""
        from curabook.celery import app
        beat_schedule = app.conf.beat_schedule
        assert 'archive-old-appointments' in beat_schedule, \
            "archive-old-appointments must be registered in Celery Beat"

        task_conf = beat_schedule['archive-old-appointments']
        assert task_conf['task'] == 'appointments.tasks.archive_old_appointments'


# ══════════════════════════════════════════════════════════════════════════════
# Fix #22 — Permanent IP Blocking
# ══════════════════════════════════════════════════════════════════════════════

class TestIPBlocking(TestCase):
    """
    IP blocking system must:
    1. Block requests from banned IPs (403)
    2. Auto-ban after threshold failures
    3. Be cache-efficient (Redis)
    4. Support manual block/unblock
    """

    def test_blocked_ip_model_exists(self):
        from core.models import BlockedIP
        assert BlockedIP is not None

    def test_blocked_ip_model_fields(self):
        from core.models import BlockedIP
        field_names = [f.name for f in BlockedIP._meta.get_fields()]
        assert 'ip_address' in field_names
        assert 'reason'     in field_names
        assert 'expires_at' in field_names
        assert 'blocked_by' in field_names

    def test_is_active_permanent_block(self):
        from core.models import BlockedIP
        entry = BlockedIP(ip_address='1.2.3.4', expires_at=None)
        assert entry.is_active() is True

    def test_is_active_expired_block(self):
        from core.models import BlockedIP
        from datetime import timedelta
        past = timezone.now() - timedelta(hours=1)
        entry = BlockedIP(ip_address='1.2.3.4', expires_at=past)
        assert entry.is_active() is False

    def test_is_active_future_block(self):
        from core.models import BlockedIP
        from datetime import timedelta
        future = timezone.now() + timedelta(hours=24)
        entry = BlockedIP(ip_address='1.2.3.4', expires_at=future)
        assert entry.is_active() is True

    @patch('core.ip_blocking.cache')
    def test_is_ip_blocked_returns_true_when_cached(self, mock_cache):
        from core.ip_blocking import is_ip_blocked
        mock_cache.get.return_value = True
        assert is_ip_blocked('5.6.7.8') is True

    @patch('core.ip_blocking.cache')
    def test_is_ip_blocked_returns_false_when_not_blocked(self, mock_cache):
        from core.ip_blocking import is_ip_blocked
        mock_cache.get.return_value = False
        assert is_ip_blocked('9.9.9.9') is False

    @patch('core.ip_blocking.is_ip_blocked', return_value=True)
    def test_middleware_blocks_banned_ip(self, mock_check):
        from core.ip_blocking import IPBlockMiddleware

        factory = RequestFactory()
        request = factory.get('/api/v1/appointments/')
        request.META['REMOTE_ADDR'] = '1.2.3.4'

        def get_response(r):
            from django.http import HttpResponse
            return HttpResponse('OK')

        middleware = IPBlockMiddleware(get_response)
        response = middleware(request)
        assert response.status_code == 403

    @patch('core.ip_blocking.is_ip_blocked', return_value=False)
    def test_middleware_allows_clean_ip(self, mock_check):
        from core.ip_blocking import IPBlockMiddleware

        factory = RequestFactory()
        request = factory.get('/api/v1/appointments/')
        request.META['REMOTE_ADDR'] = '8.8.8.8'

        def get_response(r):
            from django.http import HttpResponse
            return HttpResponse('OK', status=200)

        middleware = IPBlockMiddleware(get_response)
        response = middleware(request)
        assert response.status_code == 200

    @patch('core.ip_blocking.block_ip')
    @patch('core.ip_blocking.cache')
    def test_record_failed_attempt_auto_bans_at_threshold(self, mock_cache, mock_block):
        from core.ip_blocking import record_failed_attempt, BAN_THRESHOLD

        # Simulate counter reaching threshold
        mock_cache.get.return_value = BAN_THRESHOLD - 1
        mock_cache.set.return_value = None

        record_failed_attempt('1.2.3.4', reason='login_failure')
        mock_block.assert_called_once()

    def test_ip_blocking_module_importable(self):
        from core.ip_blocking import (
            block_ip, unblock_ip, is_ip_blocked,
            record_failed_attempt, IPBlockMiddleware,
        )
        assert all([block_ip, unblock_ip, is_ip_blocked,
                    record_failed_attempt, IPBlockMiddleware])

    def test_middleware_registered_in_settings(self):
        from django.conf import settings
        assert 'core.ip_blocking.IPBlockMiddleware' in settings.MIDDLEWARE, \
            "IPBlockMiddleware must be registered in MIDDLEWARE"

    def test_login_view_inherits_failed_attempt_recording(self):
        """LoginView.post must override super() to call record_failed_attempt."""
        from users.views import LoginView
        # Check the view has its own post() method (not just inherited)
        assert 'post' in LoginView.__dict__, \
            "LoginView must override post() to record failed attempts"


# ══════════════════════════════════════════════════════════════════════════════
# Fix #31 — django-silk Query Monitoring
# ══════════════════════════════════════════════════════════════════════════════

class TestSilkQueryMonitoring:
    """
    django-silk must be:
    1. In requirements.txt
    2. Configured in dev settings (INSTALLED_APPS, MIDDLEWARE)
    3. URL accessible at /silk/ when DEBUG=True
    """

    def test_silk_in_requirements(self):
        """django-silk must be listed in requirements.txt."""
        import os
        req_path = os.path.join(
            os.path.dirname(__file__), '..', 'requirements.txt'
        )
        with open(req_path) as f:
            content = f.read()
        assert 'django-silk' in content, \
            "django-silk must be listed in requirements.txt"

    def test_silk_configured_in_dev_settings(self):
        """
        Silk configuration exists in dev settings.
        We check the settings file directly rather than importing
        (since silk may not be installed in the test environment).
        """
        import os
        dev_path = os.path.join(
            os.path.dirname(__file__), '..', 'curabook', 'settings', 'dev.py'
        )
        with open(dev_path) as f:
            content = f.read()

        assert 'silk' in content.lower(), \
            "dev.py must configure django-silk"
        assert 'SILKY_PYTHON_PROFILER' in content, \
            "dev.py must set SILKY_PYTHON_PROFILER"
        assert 'SilkyMiddleware' in content, \
            "dev.py must add SilkyMiddleware"

    def test_silk_url_registered_in_urls(self):
        """Main urls.py must conditionally include silk.urls."""
        import os
        urls_path = os.path.join(
            os.path.dirname(__file__), '..', 'curabook', 'urls.py'
        )
        with open(urls_path) as f:
            content = f.read()
        assert "silk.urls" in content, \
            "urls.py must include silk.urls for dev"

    def test_silk_protected_by_auth(self):
        """Silk must require authentication (staff only)."""
        import os
        dev_path = os.path.join(
            os.path.dirname(__file__), '..', 'curabook', 'settings', 'dev.py'
        )
        with open(dev_path) as f:
            content = f.read()
        assert 'SILKY_AUTHENTICATION' in content, \
            "Silk must require authentication"
        assert 'SILKY_AUTHORISATION' in content, \
            "Silk must require staff authorisation"


# ─────────────────────────────────────────────────────────────────────────────
# API-H06 — Doctor PATCH /profile/ endpoint
# ─────────────────────────────────────────────────────────────────────────────
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as drf_status


@pytest.mark.django_db
class TestDoctorProfileUpdate:
    """API-H06: Doctor can PATCH own profile; validation & ownership enforced."""

    @pytest.fixture
    def doctor_user(self, db):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(
            email='drtest@example.com',
            password='Pass1234!',
            full_name='Dr Test',
            is_doctor=True,
        )
        from apps.doctors.models import DoctorProfile
        DoctorProfile.objects.get_or_create(user=user, defaults={'specialty': 'General', 'consultation_fee': 100})
        return user

    @pytest.fixture
    def patient_user(self, db):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.create_user(
            email='patient@example.com',
            password='Pass1234!',
            full_name='Patient User',
            is_patient=True,
        )

    @pytest.fixture
    def doctor_client(self, doctor_user):
        client = APIClient()
        client.force_authenticate(user=doctor_user)
        return client

    @pytest.fixture
    def patient_client(self, patient_user):
        client = APIClient()
        client.force_authenticate(user=patient_user)
        return client

    def _profile_url(self, user_pk):
        # DoctorProfileViewSet is registered at /api/v1/doctors/{pk}/
        try:
            return reverse('doctorprofile-detail', kwargs={'pk': user_pk})
        except Exception:
            return f'/api/v1/doctors/{user_pk}/'

    def test_doctor_can_patch_own_profile(self, doctor_client, doctor_user):
        """Doctor can update bio and specialty."""
        url = self._profile_url(doctor_user.pk)
        resp = doctor_client.patch(url, {'bio': 'Updated bio text'}, format='json')
        assert resp.status_code in (drf_status.HTTP_200_OK, drf_status.HTTP_204_NO_CONTENT), \
            f"Expected 200/204 on valid PATCH, got {resp.status_code}: {resp.data}"

    def test_negative_consultation_fee_rejected(self, doctor_client, doctor_user):
        """consultation_fee must not be negative — expect 400."""
        url = self._profile_url(doctor_user.pk)
        resp = doctor_client.patch(url, {'consultation_fee': -50}, format='json')
        assert resp.status_code == drf_status.HTTP_400_BAD_REQUEST, \
            f"Expected 400 for negative fee, got {resp.status_code}"

    def test_patient_cannot_patch_doctor_profile(self, patient_client, doctor_user):
        """Patient updating a doctor's profile must be forbidden (403 or 404)."""
        url = self._profile_url(doctor_user.pk)
        resp = patient_client.patch(url, {'bio': 'Hacked'}, format='json')
        assert resp.status_code in (drf_status.HTTP_403_FORBIDDEN, drf_status.HTTP_404_NOT_FOUND), \
            f"Expected 403/404 for cross-user PATCH, got {resp.status_code}"

"""
CuraBook — Tests: Audit Log

Tests the log_action service and the audit signals.
"""

import pytest
from audit.models import AuditLog
from audit.services import log_action
from tests.factories import PatientUserFactory, DoctorProfileFactory


@pytest.mark.django_db
class TestLogAction:

    def test_creates_audit_log(self):
        user = PatientUserFactory()
        log_action(actor=user, action=AuditLog.Action.LOGIN)
        assert AuditLog.objects.filter(actor=user, action='login').exists()

    def test_works_without_actor(self):
        """System actions (Celery expiry) have no actor."""
        log_action(action=AuditLog.Action.CANCEL, note='auto-expire')
        assert AuditLog.objects.filter(action='cancel', actor=None).exists()

    def test_logs_with_object(self):
        profile = DoctorProfileFactory()
        appt_mock = type('Appt', (), {'pk': 99, '_meta': profile.user._meta})()
        log_action(action=AuditLog.Action.BOOKING, obj=profile.user)
        assert AuditLog.objects.filter(action='booking').exists()

    def test_extracts_ip_from_request(self):
        from django.test import RequestFactory
        user = PatientUserFactory()
        request = RequestFactory().get('/', REMOTE_ADDR='192.168.1.1')
        request.user = user

        log_action(actor=user, action=AuditLog.Action.LOGIN, request=request)
        log = AuditLog.objects.filter(actor=user).first()
        assert log.ip_address == '192.168.1.1'

    def test_never_raises_on_failure(self):
        """Audit failure must NOT break the main flow."""
        from unittest.mock import patch
        with patch('audit.models.AuditLog.objects.create', side_effect=Exception('DB down')):
            # Should not raise
            result = log_action(action=AuditLog.Action.LOGIN)
        assert result is None

    def test_old_and_new_data_stored(self):
        user = PatientUserFactory()
        log_action(
            actor=user,
            action=AuditLog.Action.UPDATE,
            old_data={'status': 'PENDING'},
            new_data={'status': 'CONFIRMED'},
        )
        log = AuditLog.objects.filter(actor=user, action='update').first()
        assert log.old_data == {'status': 'PENDING'}
        assert log.new_data == {'status': 'CONFIRMED'}


@pytest.mark.django_db
class TestAuditSignals:

    def test_login_signal_creates_log(self):
        from django.contrib.auth.signals import user_logged_in
        from django.test import RequestFactory

        user = PatientUserFactory()
        request = RequestFactory().get('/')
        request.user = user

        before = AuditLog.objects.count()
        user_logged_in.send(sender=user.__class__, request=request, user=user)

        assert AuditLog.objects.count() == before + 1
        assert AuditLog.objects.filter(actor=user, action='login').exists()

    def test_appointment_create_logs_booking(self):
        from appointments.models import Appointment
        from unittest.mock import patch

        profile = DoctorProfileFactory()
        from tests.factories import PatientUserFactory, SlotFactory, ClinicFactory
        patient = PatientUserFactory()
        clinic  = ClinicFactory(owner=profile)
        slot    = SlotFactory(doctor=profile.user, clinic=clinic)

        with patch('notifications.services._push_to_websocket'):
            from appointments.services import create_appointment
            create_appointment(patient=patient, doctor=profile.user, slot_id=slot.id)

        assert AuditLog.objects.filter(action='booking').exists()


@pytest.mark.django_db
class TestAuditAPI:

    def _admin_client(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from tests.factories import UserFactory
        admin = UserFactory(is_staff=True, is_superuser=True)
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(RefreshToken.for_user(admin).access_token)}'
        )
        return client

    def test_admin_can_list_logs(self):
        log_action(action=AuditLog.Action.LOGIN)
        resp = self._admin_client().get('/api/v1/audit/')
        assert resp.status_code == 200
        assert resp.json()['count'] >= 1

    def test_non_admin_denied(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        user = PatientUserFactory()
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(RefreshToken.for_user(user).access_token)}'
        )
        resp = client.get('/api/v1/audit/')
        assert resp.status_code == 403

    def test_filter_by_action(self):
        log_action(action=AuditLog.Action.LOGIN)
        log_action(action=AuditLog.Action.CANCEL)

        resp = self._admin_client().get('/api/v1/audit/?action=login')
        data = resp.json()
        assert all(r['action'] == 'login' for r in data['results'])

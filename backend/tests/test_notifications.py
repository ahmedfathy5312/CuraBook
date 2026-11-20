"""
CuraBook — Unit Tests: Notification Service

Tests DB creation, WebSocket push, and email queuing.
"""

import pytest
from unittest.mock import patch, MagicMock

from notifications.models import Notification
from notifications.services import send_notification, notify_new_appointment
from tests.factories import PatientUserFactory, DoctorProfileFactory, ClinicFactory, SlotFactory, AppointmentFactory
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestSendNotification:

    def test_creates_notification_in_db(self):
        user = PatientUserFactory()

        notif = send_notification(
            user=user,
            title='Test',
            body='Test body',
            notif_type=Notification.Type.SYSTEM,
        )

        assert notif is not None
        assert Notification.objects.filter(user=user, title='Test').exists()

    def test_notification_is_unread_by_default(self):
        user = PatientUserFactory()
        notif = send_notification(user=user, title='X', body='Y')
        assert notif.is_read is False

    def test_does_not_crash_on_null_user(self):
        result = send_notification(user=None, title='X', body='Y')
        assert result is None

    @patch('notifications.services._push_to_websocket')
    def test_pushes_to_websocket(self, mock_push):
        user = PatientUserFactory()
        send_notification(user=user, title='WS Test', body='body')
        assert mock_push.called

    @patch('notifications.services._push_to_websocket')
    def test_pushes_to_correct_group(self, mock_push):
        user = PatientUserFactory()
        send_notification(user=user, title='Test', body='body')

        call_args = mock_push.call_args
        groups = call_args[1]['groups'] if call_args[1] else call_args[0][0]
        assert f'user_{user.id}' in groups

    @patch('notifications.tasks.send_notification_email.delay')
    @patch('notifications.services._push_to_websocket')
    def test_queues_email_when_requested(self, mock_push, mock_email):
        user = PatientUserFactory()
        send_notification(
            user=user, title='Email Test', body='body',
            send_email=True, email_template='confirmed'
        )
        assert mock_email.called


@pytest.mark.django_db
class TestNotificationAPI:

    def _client(self, user):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        return client

    def test_list_own_notifications(self):
        user = PatientUserFactory()
        send_notification(user=user, title='N1', body='body1')
        send_notification(user=user, title='N2', body='body2')

        resp = self._client(user).get('/api/v1/notifications/')
        assert resp.status_code == 200
        assert resp.json()['count'] == 2

    def test_cannot_see_other_users_notifications(self):
        user1 = PatientUserFactory()
        user2 = PatientUserFactory()
        send_notification(user=user1, title='Private', body='body')

        resp = self._client(user2).get('/api/v1/notifications/')
        assert resp.json()['count'] == 0

    def test_mark_single_read(self):
        user = PatientUserFactory()
        notif = send_notification(user=user, title='Read me', body='body')

        with patch('notifications.services._push_to_websocket'):
            resp = self._client(user).post(f'/api/v1/notifications/{notif.id}/mark_read/')

        assert resp.status_code == 200
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_mark_all_read(self):
        user = PatientUserFactory()
        for i in range(3):
            send_notification(user=user, title=f'N{i}', body='body')

        with patch('notifications.services._push_to_websocket'):
            resp = self._client(user).post('/api/v1/notifications/mark_all_read/')

        assert resp.status_code == 200
        assert resp.json()['marked_read'] == 3
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_unread_count(self):
        user = PatientUserFactory()
        for i in range(4):
            send_notification(user=user, title=f'N{i}', body='body')

        resp = self._client(user).get('/api/v1/notifications/unread_count/')
        assert resp.json()['unread'] == 4

    def test_filter_by_type(self):
        user = PatientUserFactory()
        send_notification(user=user, title='A', body='b', notif_type=Notification.Type.SYSTEM)
        send_notification(user=user, title='B', body='b', notif_type=Notification.Type.NEW_APPOINTMENT)

        resp = self._client(user).get(
            '/api/v1/notifications/?type=NEW_APPOINTMENT'
        )
        assert resp.json()['count'] == 1

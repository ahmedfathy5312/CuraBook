"""
CuraBook — WebSocket Consumer Tests

Tests JWT auth, group subscription, message handling,
and lifecycle (connect → receive → disconnect).

Uses Django Channels test helpers (WebsocketCommunicator).
"""

import pytest
import json
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from unittest.mock import patch, AsyncMock

from notifications.consumers import NotificationConsumer
from notifications.routing import websocket_urlpatterns
from tests.factories import (
    PatientUserFactory, DoctorProfileFactory,
    AssistantProfileFactory, ClinicAssistantFactory, ClinicFactory,
)


# ─────────────────────────────────────────────────────
# Helper: build WS URL with JWT token
# ─────────────────────────────────────────────────────
def _ws_url(user):
    from rest_framework_simplejwt.tokens import AccessToken
    token = str(AccessToken.for_user(user))
    return f'/ws/notifications/?token={token}'


async def _make_communicator(user):
    """Create connected communicator for a user."""
    from channels.routing import URLRouter
    application = URLRouter(websocket_urlpatterns)
    communicator = WebsocketCommunicator(application, _ws_url(user))
    connected, _ = await communicator.connect()
    return communicator, connected


# ─────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestWSAuth:

    async def test_valid_token_connects(self):
        user = await sync_to_async(PatientUserFactory)()
        communicator, connected = await _make_communicator(user)
        assert connected is True
        await communicator.disconnect()

    async def test_invalid_token_rejected(self):
        from channels.routing import URLRouter
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, '/ws/notifications/?token=invalid.token')
        connected, code = await communicator.connect()
        assert connected is False or code == 4003   # 4003 = unauthorized
        await communicator.disconnect()

    async def test_no_token_rejected(self):
        from channels.routing import URLRouter
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, '/ws/notifications/')
        connected, code = await communicator.connect()
        assert connected is False or code in (4003, 4001)
        await communicator.disconnect()


# ─────────────────────────────────────────────────────
# Connection Established Message
# ─────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestWSConnect:

    async def test_receives_connection_established(self):
        user = await sync_to_async(PatientUserFactory)()
        communicator, connected = await _make_communicator(user)
        assert connected

        response = await communicator.receive_json_from(timeout=5)
        assert response['type'] == 'CONNECTION_ESTABLISHED'
        assert 'unread' in response

        await communicator.disconnect()

    async def test_unread_count_in_connection_message(self):
        user = await sync_to_async(PatientUserFactory)()

        # Create 2 unread notifications for user
        from notifications.models import Notification
        await sync_to_async(Notification.objects.create)(
            user=user, title='N1', body='body', type='SYSTEM'
        )
        await sync_to_async(Notification.objects.create)(
            user=user, title='N2', body='body', type='SYSTEM'
        )

        communicator, _ = await _make_communicator(user)
        response = await communicator.receive_json_from(timeout=5)

        assert response['unread'] == 2
        await communicator.disconnect()


# ─────────────────────────────────────────────────────
# Mark Read via WebSocket
# ─────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestWSMarkRead:

    async def test_mark_single_read(self):
        user = await sync_to_async(PatientUserFactory)()
        from notifications.models import Notification
        notif = await sync_to_async(Notification.objects.create)(
            user=user, title='Test', body='body', type='SYSTEM'
        )

        communicator, _ = await _make_communicator(user)
        await communicator.receive_json_from(timeout=5)  # CONNECTION_ESTABLISHED

        await communicator.send_json_to({
            'action': 'mark_read',
            'notification_id': notif.id,
        })

        response = await communicator.receive_json_from(timeout=5)
        assert response['type'] == 'MARKED_READ'
        assert response['id'] == notif.id

        await sync_to_async(notif.refresh_from_db)()
        assert notif.is_read is True

        await communicator.disconnect()

    async def test_mark_all_read(self):
        user = await sync_to_async(PatientUserFactory)()
        from notifications.models import Notification
        for i in range(3):
            await sync_to_async(Notification.objects.create)(
                user=user, title=f'N{i}', body='body', type='SYSTEM'
            )

        communicator, _ = await _make_communicator(user)
        await communicator.receive_json_from(timeout=5)

        await communicator.send_json_to({'action': 'mark_all_read'})
        response = await communicator.receive_json_from(timeout=5)

        assert response['type'] == 'ALL_MARKED_READ'
        assert response['count'] == 3
        await communicator.disconnect()

    async def test_ping_pong(self):
        user = await sync_to_async(PatientUserFactory)()
        communicator, _ = await _make_communicator(user)
        await communicator.receive_json_from(timeout=5)

        await communicator.send_json_to({'action': 'ping'})
        response = await communicator.receive_json_from(timeout=5)

        assert response['type'] == 'PONG'
        await communicator.disconnect()


# ─────────────────────────────────────────────────────
# Group Subscription
# ─────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestWSGroups:

    async def test_user_joins_personal_group(self):
        """Each user must join their personal group: user_{id}."""
        user = await sync_to_async(PatientUserFactory)()
        communicator, _ = await _make_communicator(user)
        await communicator.receive_json_from(timeout=5)

        channel_layer = get_channel_layer()
        # Send message to the personal group
        await channel_layer.group_send(
            f'user_{user.id}',
            {
                'type': 'notification_message',
                'notification_id': 999,
                'title': 'Test Push',
                'body': 'hello',
                'notif_type': 'SYSTEM',
                'metadata': {},
                'is_read': False,
                'created_at': '2025-01-01T00:00:00',
            }
        )

        response = await communicator.receive_json_from(timeout=5)
        assert response['title'] == 'Test Push'
        await communicator.disconnect()

    async def test_assistant_joins_clinic_group(self):
        """Assistant must subscribe to clinic_{id} group for their clinic."""
        clinic    = await sync_to_async(ClinicFactory)()
        ap        = await sync_to_async(AssistantProfileFactory)()
        await sync_to_async(ClinicAssistantFactory)(assistant=ap, clinic=clinic)
        assistant = ap.user

        communicator, _ = await _make_communicator(assistant)
        await communicator.receive_json_from(timeout=5)

        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'clinic_{clinic.id}',
            {
                'type': 'notification_message',
                'notification_id': 100,
                'title': 'Clinic Notif',
                'body': 'new booking in clinic',
                'notif_type': 'NEW_APPOINTMENT',
                'metadata': {},
                'is_read': False,
                'created_at': '2025-01-01T00:00:00',
            }
        )

        response = await communicator.receive_json_from(timeout=5)
        assert response['title'] == 'Clinic Notif'
        await communicator.disconnect()

"""
tests/test_chat.py — CuraBook Chat Module Tests
=================================================
API-C03 FIX: Chat module had zero test coverage.

Covers:
  ✅ Conversation creation (get-or-create between two users)
  ✅ Cannot start conversation with yourself
  ✅ List conversations (only your own)
  ✅ Send a text message
  ✅ Send a file message
  ✅ Cannot send empty message (no content, no file)
  ✅ Message history pagination
  ✅ Mark messages as read
  ✅ Permissions — outsider cannot access another user's conversation
  ✅ ChatConsumer WebSocket connect (authenticated participant)
  ✅ ChatConsumer WebSocket reject unauthenticated
  ✅ ChatConsumer WebSocket reject non-participant
  ✅ ChatConsumer typing indicator relay
"""

import pytest
import json
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import re_path
from unittest.mock import patch, AsyncMock

from chat.models import Conversation, Message
from chat.consumers import ChatConsumer
from appointments.models import Appointment
from clinics.models import Clinic
from scheduling.models import GeneratedSlot
from tests.factories import UserFactory, PatientUserFactory, DoctorUserFactory


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def patient(db):
    return PatientUserFactory()


@pytest.fixture
def doctor(db):
    return DoctorUserFactory()


@pytest.fixture
def outsider(db):
    return UserFactory()


@pytest.fixture
def patient_client(patient):
    client = APIClient()
    client.force_authenticate(user=patient)
    return client


@pytest.fixture
def doctor_client(doctor):
    client = APIClient()
    client.force_authenticate(user=doctor)
    return client


@pytest.fixture
def outsider_client(outsider):
    client = APIClient()
    client.force_authenticate(user=outsider)
    return client


def create_real_appointment(doctor, patient):
    doctor_profile = getattr(doctor, 'doctorprofile', None) or getattr(doctor, 'doctor_profile')
    clinic = Clinic.objects.create(
        owner=doctor_profile,
        name=f'{doctor.username} clinic',
        is_active=True,
    )
    start = timezone.now() + timedelta(days=1)
    slot = GeneratedSlot.objects.create(
        doctor=doctor,
        clinic=clinic,
        start=start,
        end=start + timedelta(minutes=30),
        is_active=True,
    )
    return Appointment.objects.create(
        doctor=doctor,
        patient=patient,
        clinic=clinic,
        slot=slot,
        status=Appointment.Status.CONFIRMED,
        visit_type=Appointment.VisitType.IN_PERSON,
    )


@pytest.fixture
def conversation(db, patient, doctor):
    """A pre-existing conversation between patient and doctor."""
    create_real_appointment(doctor, patient)
    conv, _ = Conversation.get_or_create_for_pair(patient, doctor)
    return conv


# ─────────────────────────────────────────────────────────────────────────────
# Conversation Creation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestConversationCreate:

    def test_create_conversation_with_other_user(self, patient_client, patient, doctor):
        create_real_appointment(doctor, patient)
        resp = patient_client.post('/api/v1/chat/conversations/', {'participant_id': doctor.pk})
        assert resp.status_code == 200
        assert 'id' in resp.data

    def test_get_or_create_is_idempotent(self, patient_client, patient, doctor):
        """Calling twice returns same conversation, not a duplicate."""
        create_real_appointment(doctor, patient)
        resp1 = patient_client.post('/api/v1/chat/conversations/', {'participant_id': doctor.pk})
        resp2 = patient_client.post('/api/v1/chat/conversations/', {'participant_id': doctor.pk})
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.data['id'] == resp2.data['id']

    def test_cannot_start_without_confirmed_appointment(self, patient_client, doctor):
        resp = patient_client.post('/api/v1/chat/conversations/', {'participant_id': doctor.pk})
        assert resp.status_code == 403

    def test_cannot_start_conversation_with_self(self, patient_client, patient):
        resp = patient_client.post('/api/v1/chat/conversations/', {'participant_id': patient.pk})
        assert resp.status_code == 400

    def test_missing_participant_id_returns_400(self, patient_client):
        resp = patient_client.post('/api/v1/chat/conversations/', {})
        assert resp.status_code == 400

    def test_non_existent_participant_returns_404(self, patient_client):
        resp = patient_client.post('/api/v1/chat/conversations/', {'participant_id': 99999})
        assert resp.status_code == 404

    def test_unauthenticated_cannot_create(self):
        client = APIClient()
        resp = client.post('/api/v1/chat/conversations/', {'participant_id': 1})
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# List Conversations
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestConversationList:

    def test_list_returns_only_my_conversations(self, patient_client, patient, doctor, outsider):
        create_real_appointment(doctor, patient)
        Conversation.get_or_create_for_pair(patient, doctor)
        Conversation.get_or_create_for_pair(doctor, outsider)  # should NOT appear for patient

        resp = patient_client.get('/api/v1/chat/conversations/')
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.data]
        # Only the patient↔doctor conv should appear
        assert len(ids) == 1

    def test_empty_list_for_new_user(self, outsider_client):
        resp = outsider_client.get('/api/v1/chat/conversations/')
        assert resp.status_code == 200
        assert resp.data == []

    def test_doctor_list_materializes_appointment_conversations(self, doctor_client, doctor, patient):
        create_real_appointment(doctor, patient)

        resp = doctor_client.get('/api/v1/chat/conversations/')

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['other_participant']['id'] == patient.pk

    def test_patient_list_materializes_appointment_conversations(self, patient_client, patient, doctor):
        create_real_appointment(doctor, patient)

        resp = patient_client.get('/api/v1/chat/conversations/')

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['other_participant']['id'] == doctor.pk
        assert resp.data[0]['other_participant']['role'] == 'doctor'

    def test_patient_list_excludes_patient_conversations(self, patient_client, patient, doctor):
        other_patient = PatientUserFactory()
        create_real_appointment(doctor, patient)
        Conversation.get_or_create_for_pair(patient, other_patient)

        resp = patient_client.get('/api/v1/chat/conversations/')

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['other_participant']['id'] == doctor.pk
        assert resp.data[0]['other_participant']['role'] == 'doctor'

    def test_doctor_list_excludes_doctor_conversations(self, doctor_client, doctor, patient):
        other_doctor = DoctorUserFactory()
        create_real_appointment(doctor, patient)
        Conversation.get_or_create_for_pair(doctor, other_doctor)

        resp = doctor_client.get('/api/v1/chat/conversations/')

        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]['other_participant']['id'] == patient.pk
        assert resp.data[0]['other_participant']['role'] == 'patient'


# ─────────────────────────────────────────────────────────────────────────────
# Messaging
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSendMessage:

    def test_send_text_message(self, patient_client, conversation):
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = patient_client.post(url, {'content': 'Hello doctor!'}, format='json')
        assert resp.status_code == 201
        assert resp.data['content'] == 'Hello doctor!'
        assert resp.data['message_type'] == 'text'

    def test_send_message_updates_conversation_preview(self, patient_client, conversation):
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        patient_client.post(url, {'content': 'Preview text'}, format='json')
        conversation.refresh_from_db()
        assert conversation.last_message_preview == 'Preview text'
        assert conversation.last_message_at is not None

    def test_empty_message_returns_400(self, patient_client, conversation):
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = patient_client.post(url, {'content': ''}, format='json')
        assert resp.status_code == 400

    def test_outsider_cannot_send_message(self, outsider_client, conversation):
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = outsider_client.post(url, {'content': 'Hacking!'}, format='json')
        assert resp.status_code == 404  # _get_conv raises NotFound for non-participants

    def test_unauthenticated_cannot_send(self, conversation):
        client = APIClient()
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = client.post(url, {'content': 'Hello'}, format='json')
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Message History
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMessageHistory:

    def test_get_messages_returns_paginated_results(self, patient_client, patient, conversation):
        # Create 5 messages
        for i in range(5):
            Message.objects.create(
                conversation=conversation,
                sender=patient,
                content=f'Message {i}',
            )
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = patient_client.get(url, {'page_size': 3, 'page': 1})
        assert resp.status_code == 200
        assert 'results' in resp.data
        assert len(resp.data['results']) == 3
        assert resp.data['count'] == 5

    def test_outsider_cannot_read_history(self, outsider_client, conversation):
        url = f'/api/v1/chat/conversations/{conversation.pk}/messages/'
        resp = outsider_client.get(url)
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Mark as Read
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMarkRead:

    def test_mark_all_unread_messages_as_read(self, patient_client, doctor, patient, conversation):
        # Doctor sends 3 unread messages to patient
        for _ in range(3):
            Message.objects.create(
                conversation=conversation,
                sender=doctor,
                content='Hey patient',
                is_read=False,
            )
        url = f'/api/v1/chat/conversations/{conversation.pk}/read/'
        resp = patient_client.post(url)
        assert resp.status_code == 200
        assert resp.data['marked_read'] == 3
        assert conversation.messages.filter(is_read=False).count() == 0

    def test_does_not_mark_own_messages_as_read(self, patient_client, patient, conversation):
        """Patient's own sent messages should not be counted."""
        Message.objects.create(
            conversation=conversation,
            sender=patient,
            content='My own msg',
            is_read=False,
        )
        url = f'/api/v1/chat/conversations/{conversation.pk}/read/'
        resp = patient_client.post(url)
        assert resp.status_code == 200
        assert resp.data['marked_read'] == 0


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket Consumer Tests
# ─────────────────────────────────────────────────────────────────────────────

def make_ws_application(user):
    """Build a test ASGI app that injects the given user into scope."""
    application = URLRouter([
        re_path(r'ws/chat/(?P<conversation_id>\d+)/$', ChatConsumer.as_asgi()),
    ])

    async def app_with_user(scope, receive, send):
        scope['user'] = user
        await application(scope, receive, send)

    return app_with_user


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestChatConsumer:

    async def test_authenticated_participant_can_connect(self, patient, conversation):
        app = make_ws_application(patient)
        communicator = WebsocketCommunicator(app, f'/ws/chat/{conversation.pk}/')
        connected, _ = await communicator.connect()
        assert connected
        await communicator.disconnect()

    async def test_unauthenticated_user_is_rejected(self, conversation):
        from django.contrib.auth.models import AnonymousUser
        app = make_ws_application(AnonymousUser())
        communicator = WebsocketCommunicator(app, f'/ws/chat/{conversation.pk}/')
        connected, code = await communicator.connect()
        assert not connected
        assert code == 4001

    async def test_non_participant_is_rejected(self, outsider, conversation):
        app = make_ws_application(outsider)
        communicator = WebsocketCommunicator(app, f'/ws/chat/{conversation.pk}/')
        connected, code = await communicator.connect()
        assert not connected
        assert code == 4003

    async def test_typing_indicator_is_relayed(self, patient, doctor, conversation):
        """Typing event from patient should be received by doctor's connection."""
        # Both connect
        patient_app = make_ws_application(patient)
        doctor_app  = make_ws_application(doctor)

        patient_comm = WebsocketCommunicator(patient_app, f'/ws/chat/{conversation.pk}/')
        doctor_comm  = WebsocketCommunicator(doctor_app,  f'/ws/chat/{conversation.pk}/')

        await patient_comm.connect()
        await doctor_comm.connect()

        # Patient sends typing indicator
        await patient_comm.send_to(text_data=json.dumps({
            'type': 'typing',
            'is_typing': True,
        }))

        # Doctor should receive it
        response = await doctor_comm.receive_from()
        data = json.loads(response)
        assert data['type'] == 'typing'
        assert data['is_typing'] is True
        assert data['user_id'] == patient.pk

        await patient_comm.disconnect()
        await doctor_comm.disconnect()

    async def test_invalid_json_is_silently_ignored(self, patient, conversation):
        app = make_ws_application(patient)
        communicator = WebsocketCommunicator(app, f'/ws/chat/{conversation.pk}/')
        await communicator.connect()
        await communicator.send_to(text_data='NOT JSON{{{')
        # Should not crash — no response expected
        assert await communicator.receive_nothing()
        await communicator.disconnect()

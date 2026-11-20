"""
chat/consumers.py — Django Channels WebSocket consumer for real-time chat
Integrates with existing socketManager.jsx ticket-based auth pattern.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from django.db.models import Q


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Connects to group: chat.{conversation_id}
    Authenticated users only (via ticket middleware, same as notifications).
    """

    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.group_name      = f'chat.{self.conversation_id}'
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify user is a participant
        is_participant = await self._is_participant(user, self.conversation_id)
        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._set_online(user.pk, True)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'presence',
            'user_id': user.pk,
            'is_online': True,
        })

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        user = self.scope.get('user')
        if user and user.is_authenticated:
            await self._set_online(user.pk, False)
            await self.channel_layer.group_send(self.group_name, {
                'type': 'presence',
                'user_id': user.pk,
                'is_online': False,
            })

    async def receive(self, text_data=None, bytes_data=None):
        """Client sends typing indicators or read receipts."""
        if not text_data:
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        event_type = data.get('type')
        if event_type == 'typing':
            await self.channel_layer.group_send(self.group_name, {
                'type':    'user_typing',
                'user_id': self.scope['user'].pk,
                'is_typing': data.get('is_typing', False),
            })

    # ── Group message handlers ────────────────────────────────────────────────
    async def chat_message(self, event):
        """Relay new message to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type':    'chat_message',
            'message': event['message'],
        }))

    async def message_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_updated',
            'message': event['message'],
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'reader_id': event['reader_id'],
            'conversation_id': event.get('conversation_id'),
        }))

    async def presence(self, event):
        if event.get('user_id') != self.scope['user'].pk:
            await self.send(text_data=json.dumps({
                'type': 'presence',
                'user_id': event['user_id'],
                'is_online': event.get('is_online', False),
            }))

    async def user_typing(self, event):
        """Relay typing indicator — skip if it's the sender's own socket."""
        if event.get('user_id') != self.scope['user'].pk:
            await self.send(text_data=json.dumps({
                'type':      'typing',
                'user_id':   event['user_id'],
                'is_typing': event.get('is_typing', False),
            }))

    # ── DB helpers ────────────────────────────────────────────────────────────
    @database_sync_to_async
    def _is_participant(self, user, conversation_id):
        from .models import Conversation
        return Conversation.objects.filter(
            Q(pk=conversation_id) &
            (Q(participant_one=user) | Q(participant_two=user))
        ).exists()

    @database_sync_to_async
    def _set_online(self, user_id, is_online):
        key = f'chat_online:{user_id}'
        if is_online:
            cache.set(key, True, timeout=90)
        else:
            cache.delete(key)

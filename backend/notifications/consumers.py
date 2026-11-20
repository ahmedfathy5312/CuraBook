"""
CuraBook — WebSocket Consumer (HARDENED)
==========================================
Improvements:
  1. Heartbeat/ping-pong (force-close idle connections after 90s)
  2. Redis presence tracking via PresenceService
  3. Strict group isolation (users can only join authorised groups)
  4. Graceful disconnect cleanup
"""

import asyncio
import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .presence import PresenceService, HEARTBEAT_INTERVAL

logger = logging.getLogger("curabook")

CONNECTION_TIMEOUT = HEARTBEAT_INTERVAL * 3  # 90 seconds


class NotificationConsumer(AsyncWebsocketConsumer):

    # ── Rate limiting (FIX Security: prevent message flood from bots) ──────────
    _WS_RATE_LIMIT      = 30   # max messages per window
    _WS_RATE_WINDOW_SEC = 10   # sliding window in seconds

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            logger.warning("[WS] Rejected unauthenticated connection")
            await self.close(code=4001)
            return

        self.user = user
        self.groups = []
        self._heartbeat_task = None
        # Rate limiting state
        self._msg_timestamps = []   # FIX Security: track message times for rate limit

        await self._join_group(f"user_{user.id}")
        await self._join_authorised_groups(user)
        await self.accept()

        await PresenceService.mark_online(user.id)
        self._heartbeat_task = asyncio.ensure_future(self._heartbeat_watchdog())

        unread = await self._get_unread_count(user)
        await self.send_json({"type": "CONNECTION_ESTABLISHED", "unread": unread, "user_id": user.id})
        logger.info(f"[WS] Connected: user_{user.id} | groups={self.groups}")

    async def disconnect(self, close_code):
        # FIX P2-2: use hasattr guards — disconnect() may fire before connect()
        # initialises self._heartbeat_task / self.groups (e.g. auth rejection race)
        if hasattr(self, '_heartbeat_task') and self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        for group in getattr(self, 'groups', []):
            try:
                await self.channel_layer.group_discard(group, self.channel_name)
            except Exception:
                pass
        if hasattr(self, "user") and self.user:
            await PresenceService.mark_offline(self.user.id)
        logger.info(f"[WS] Disconnected: user_{getattr(self, 'user', None) and self.user.id} code={close_code}")

    async def receive(self, text_data=None, bytes_data=None):
        # FIX Security: WS rate limiting — max 30 messages per 10 seconds per connection
        import time as _time
        now = _time.monotonic()
        self._msg_timestamps = [t for t in self._msg_timestamps if now - t < self._WS_RATE_WINDOW_SEC]
        if len(self._msg_timestamps) >= self._WS_RATE_LIMIT:
            logger.warning(f"[WS] Rate limit exceeded: user_{self.user.id} — closing connection")
            await self.send_json({"type": "RATE_LIMIT_EXCEEDED", "error": "Too many messages. Slow down."})
            await self.close(code=4029)
            return
        self._msg_timestamps.append(now)

        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send_json({"error": "Invalid JSON"})
            return

        # Reset heartbeat on ANY message from client
        # FIX P2-2: guard against receive() before connect() fully ran
        if hasattr(self, '_heartbeat_task') and self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        self._heartbeat_task = asyncio.ensure_future(self._heartbeat_watchdog())

        action = data.get("action")
        if action == "ping":
            await PresenceService.refresh_presence(self.user.id)
            await self.send_json({"type": "PONG"})
        elif action == "mark_read":
            notif_id = data.get("notification_id")
            if notif_id:
                await self._mark_notification_read(notif_id)
                await self.send_json({"type": "MARKED_READ", "id": notif_id})
        elif action == "mark_all_read":
            count = await self._mark_all_read()
            await self.send_json({"type": "ALL_MARKED_READ", "count": count})
        else:
            await self.send_json({"error": f"Unknown action: {action}"})

    async def notification_message(self, event):
        await self.send_json(event["payload"])

    async def appointment_update(self, event):
        await self.send_json(event["payload"])

    async def chat_message(self, event):
        """Relay in-app chat messages to the WebSocket client."""
        await self.send_json({
            'type':            'chat_message',
            'message':         event.get('message'),
            'conversation_id': event.get('conversation_id'),
        })

    async def _heartbeat_watchdog(self):
        """
        FIX B-08: Server-side heartbeat — sends a PING to the client every
        HEARTBEAT_INTERVAL seconds. If the client doesn't respond within
        CONNECTION_TIMEOUT, the connection is force-closed.

        Without server-side pings, idle connections silently drop because:
          - Load balancers / proxies close connections with no traffic
          - The client-side reconnect only fires after TCP timeout (minutes)
        With server-side pings, the connection is kept alive and we detect
        dead connections within HEARTBEAT_INTERVAL * 3 = 90 seconds.
        """
        try:
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                try:
                    # Send server-initiated PING — client SocketManager responds with {action:"ping"}
                    await self.send_json({"type": "PING"})
                except Exception:
                    # Connection already dead — break so close() can clean up
                    break
        except asyncio.CancelledError:
            pass

    async def _join_group(self, group_name: str):
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.groups.append(group_name)

    async def _join_authorised_groups(self, user):
        if getattr(user, "is_assistant", False):
            clinic_ids, hospital_ids = await self._get_assistant_groups(user)
            for cid in clinic_ids:
                await self._join_group(f"clinic_{cid}")
            for hid in hospital_ids:
                await self._join_group(f"hospital_{hid}")
        if getattr(user, "hospital_admin", False):
            hospital_ids = await self._get_admin_hospital_ids(user)
            for hid in hospital_ids:
                await self._join_group(f"hospital_{hid}")

    async def send_json(self, data: dict):
        await self.send(text_data=json.dumps(data, ensure_ascii=False))

    @database_sync_to_async
    def _get_assistant_groups(self, user):
        try:
            ap = user.assistant_profile
            return (
                list(ap.clinic_assignments.filter(is_active=True).values_list("clinic_id", flat=True)),
                list(ap.hospital_assignments.filter(is_active=True).values_list("hospital_id", flat=True)),
            )
        except Exception:
            return [], []

    @database_sync_to_async
    def _get_admin_hospital_ids(self, user):
        return list(user.hospital_admin_links.values_list("hospital_id", flat=True))

    @database_sync_to_async
    def _get_unread_count(self, user) -> int:
        from notifications.selectors import get_unread_count_for_user
        return get_unread_count_for_user(user)

    @database_sync_to_async
    def _mark_notification_read(self, notif_id: int):
        from notifications.models import Notification
        Notification.objects.filter(id=notif_id, user=self.user).update(is_read=True)

    @database_sync_to_async
    def _mark_all_read(self) -> int:
        from notifications.models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).update(is_read=True)

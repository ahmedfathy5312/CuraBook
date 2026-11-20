"""
CuraBook — WebSocket Presence Tracking (Redis-backed)
=======================================================
Tracks which users are currently online via WebSocket connections.

Redis Key Schema:
  ws:online:{user_id}          → 1 (SET with TTL = heartbeat interval * 2)
  ws:connections:{user_id}     → count (INCR/DECR for multi-tab support)

Usage:
    await PresenceService.mark_online(user_id)
    await PresenceService.mark_offline(user_id)
    is_online = await PresenceService.is_user_online(user_id)
    count = await PresenceService.get_online_count()
"""

import logging
from channels.db import database_sync_to_async

logger = logging.getLogger('curabook')

# TTL slightly longer than heartbeat interval
PRESENCE_TTL    = 90   # seconds — refreshed on each heartbeat
HEARTBEAT_INTERVAL = 30  # seconds — client must ping every 30s


class PresenceService:
    """
    All presence operations are async-safe via database_sync_to_async wrapper.
    Uses Django's cache framework (Redis backend).
    """

    ONLINE_KEY_PREFIX = 'ws:online:'
    CONN_KEY_PREFIX   = 'ws:connections:'

    @classmethod
    def _online_key(cls, user_id: int) -> str:
        return f'{cls.ONLINE_KEY_PREFIX}{user_id}'

    @classmethod
    def _conn_key(cls, user_id: int) -> str:
        return f'{cls.CONN_KEY_PREFIX}{user_id}'

    # ──────────────────────────────────────────────────────
    # Sync methods (wrapped below for async use)
    # ──────────────────────────────────────────────────────

    @classmethod
    def _sync_mark_online(cls, user_id: int) -> None:
        from django.core.cache import cache
        try:
            # SET presence key with TTL
            cache.set(cls._online_key(user_id), 1, timeout=PRESENCE_TTL)
            # Track connection count (supports multiple tabs)
            conn_key = cls._conn_key(user_id)
            conn_count = cache.get(conn_key, 0)
            cache.set(conn_key, conn_count + 1, timeout=None)
        except Exception as e:
            logger.warning(f'[Presence] mark_online failed for user_{user_id}: {e}')

    @classmethod
    def _sync_mark_offline(cls, user_id: int) -> None:
        from django.core.cache import cache
        try:
            conn_key = cls._conn_key(user_id)
            conn_count = cache.get(conn_key, 1)
            if conn_count <= 1:
                # Last connection closed — truly offline
                cache.delete(cls._online_key(user_id))
                cache.delete(conn_key)
            else:
                cache.set(conn_key, conn_count - 1, timeout=None)
        except Exception as e:
            logger.warning(f'[Presence] mark_offline failed for user_{user_id}: {e}')

    @classmethod
    def _sync_refresh_presence(cls, user_id: int) -> None:
        """Called on each heartbeat to reset TTL."""
        from django.core.cache import cache
        try:
            cache.set(cls._online_key(user_id), 1, timeout=PRESENCE_TTL)
        except Exception as e:
            logger.warning(f'[Presence] refresh failed for user_{user_id}: {e}')

    @classmethod
    def _sync_is_online(cls, user_id: int) -> bool:
        from django.core.cache import cache
        try:
            return bool(cache.get(cls._online_key(user_id)))
        except Exception:
            return False

    @classmethod
    def _sync_get_online_count(cls) -> int:
        """
        Returns approximate count of online users.
        Uses Django cache — requires Redis backend with key scanning.
        Falls back to 0 on non-Redis backends.
        """
        try:
            from django.core.cache import cache
            # Redis-specific: use scan to count keys matching prefix
            client = cache.client.get_client()
            keys = list(client.scan_iter(f'{cls.ONLINE_KEY_PREFIX}*'))
            return len(keys)
        except AttributeError:
            # Non-Redis backend — return 0
            return 0
        except Exception as e:
            logger.warning(f'[Presence] get_online_count failed: {e}')
            return 0

    # ──────────────────────────────────────────────────────
    # Async wrappers
    # ──────────────────────────────────────────────────────

    @classmethod
    async def mark_online(cls, user_id: int) -> None:
        await database_sync_to_async(cls._sync_mark_online)(user_id)

    @classmethod
    async def mark_offline(cls, user_id: int) -> None:
        await database_sync_to_async(cls._sync_mark_offline)(user_id)

    @classmethod
    async def refresh_presence(cls, user_id: int) -> None:
        await database_sync_to_async(cls._sync_refresh_presence)(user_id)

    @classmethod
    async def is_user_online(cls, user_id: int) -> bool:
        return await database_sync_to_async(cls._sync_is_online)(user_id)

    @classmethod
    async def get_online_count(cls) -> int:
        return await database_sync_to_async(cls._sync_get_online_count)()

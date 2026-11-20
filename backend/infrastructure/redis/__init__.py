"""
CuraBook — Redis Distributed Lock
===================================
Prevents race conditions on critical operations:
  - Slot booking (prevents double-booking between concurrent requests)
  - Appointment creation (prevents concurrent patients booking same slot)

Usage:
    from infrastructure.redis import acquire_slot_lock, SlotAlreadyLockedException

    with acquire_slot_lock(slot_id=42):
        # guaranteed exclusive access
        slot = GeneratedSlot.objects.select_for_update().get(id=42)
        ...

Lock Strategy:
  1. Redis SET NX EX      — atomic lock acquisition
  2. DB select_for_update — second line of defense
  3. DB UniqueConstraint  — third line of defense

Redis key pattern:  lock:slot_booking:{slot_id}
Default TTL:        15 seconds  (auto-released on crash)
Default timeout:    5 seconds   (wait before giving up)
"""

import time
import uuid
import logging
from contextlib import contextmanager
from typing import Optional

from django.core.cache import cache

logger = logging.getLogger("curabook")


# ─────────────────────────────────────────────
# Exceptions
# ─────────────────────────────────────────────

class SlotAlreadyLockedException(Exception):
    """Raised when slot lock cannot be acquired within timeout."""
    pass


class RedisLockException(Exception):
    """General Redis lock error."""
    pass


# ─────────────────────────────────────────────
# Core Lock
# ─────────────────────────────────────────────

class RedisLock:
    """
    Distributed Redis lock using SET NX EX pattern.
    Each lock has a unique token so only the owner can release it.
    Thread-safe and process-safe.
    """

    def __init__(
        self,
        key: str,
        ttl: int = 15,
        timeout: float = 5.0,
        retry_interval: float = 0.05,
    ):
        self.key = f"lock:{key}"
        self.ttl = ttl
        self.timeout = timeout
        self.retry_interval = retry_interval
        self._token: Optional[str] = None

    def acquire(self) -> bool:
        self._token = str(uuid.uuid4())
        deadline = time.monotonic() + self.timeout

        while time.monotonic() < deadline:
            try:
                acquired = cache.set(
                    self.key,
                    self._token,
                    timeout=self.ttl,
                    nx=True,          # SET only if Not eXists — atomic
                )
                if acquired:
                    logger.debug(f"[Lock] Acquired: {self.key}")
                    return True
            except Exception as e:
                # Redis unavailable — raise immediately so caller knows lock failed
                # DB select_for_update() is still active as a fallback layer
                logger.error(
                    f"[Lock] Redis unavailable on acquire({self.key}): {e}. "
                    f"DB-level select_for_update() will act as fallback."
                )
                raise RedisLockException(
                    f"Redis lock service unavailable: {e}"
                ) from e

            time.sleep(self.retry_interval)

        logger.warning(f"[Lock] Timeout: {self.key}")
        return False

    def release(self) -> None:
        if not self._token:
            return
        try:
            # Only release if we still own the lock
            if cache.get(self.key) == self._token:
                cache.delete(self.key)
                logger.debug(f"[Lock] Released: {self.key}")
        except Exception as e:
            logger.warning(f"[Lock] Redis error on release({self.key}): {e}")

    def __enter__(self):
        if not self.acquire():
            raise SlotAlreadyLockedException(
                f"Could not acquire lock on {self.key} within {self.timeout}s"
            )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False


# ─────────────────────────────────────────────
# Domain-Specific Helpers
# ─────────────────────────────────────────────

@contextmanager
def acquire_slot_lock(slot_id: int, timeout: float = 5.0):
    """
    Acquire distributed lock for a specific slot booking.

    Usage:
        from infrastructure.redis import acquire_slot_lock, SlotAlreadyLockedException

        try:
            with acquire_slot_lock(slot_id=42):
                slot = GeneratedSlot.objects.select_for_update().get(id=42)
                # book it safely
        except SlotAlreadyLockedException:
            raise ValidationError("This slot is currently being booked. Please try again.")
    """
    lock = RedisLock(
        key=f"slot_booking:{slot_id}",
        ttl=15,
        timeout=timeout,
        retry_interval=0.05,
    )
    with lock:
        yield lock


@contextmanager
def acquire_appointment_lock(patient_id: int, doctor_id: int):
    """
    Prevent same patient from submitting duplicate concurrent booking
    requests for the same doctor.
    """
    lock = RedisLock(
        key=f"appointment_create:{patient_id}:{doctor_id}",
        ttl=10,
        timeout=3.0,
    )
    with lock:
        yield lock


def get_lock(key: str, ttl: int = 10, timeout: float = 5.0) -> RedisLock:
    """Generic lock factory for any key."""
    return RedisLock(key=key, ttl=ttl, timeout=timeout)

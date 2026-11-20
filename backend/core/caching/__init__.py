"""
CuraBook — Centralized Redis Caching Strategy
===============================================
All cache keys and TTLs are defined here to avoid scattered magic strings.

Cache Key Strategy:
    doctor_search:v{version}:{hash}          → doctor search results
    doctor_profile:{doctor_id}               → doctor profile data
    clinic_list:{hash}                        → clinic listings
    hospital_list:{hash}                      → hospital listings
    dashboard:doctor:{doctor_id}             → doctor dashboard metrics
    dashboard:hospital:{hospital_id}         → hospital dashboard metrics
    dashboard:platform                       → platform-wide metrics
    unread_notifications:{user_id}           → unread notification count

Invalidation Strategy:
    - Doctor updated          → invalidate doctor_search, doctor_profile
    - Review added            → invalidate doctor_search (rating changed)
    - Schedule changed        → invalidate doctor_search (availability changed)
    - Appointment status changed → invalidate dashboard caches

Usage:
    from core.caching import CacheKeys, CacheService

    # Get cached doctor search
    data = CacheService.get(CacheKeys.doctor_search(filters))
    CacheService.set(CacheKeys.doctor_search(filters), data, ttl=CacheService.TTL_SEARCH)

    # Invalidate when doctor profile changes
    CacheService.invalidate_doctor(doctor_id)
"""

import hashlib
import json
import logging
from django.core.cache import cache

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Cache TTL Constants
# ─────────────────────────────────────────────

class TTL:
    SEARCH         = 60 * 10     # 10 minutes — doctor search results
    PROFILE        = 60 * 30     # 30 minutes — doctor/clinic/hospital profiles
    DASHBOARD      = 60 * 5      # 5 minutes  — dashboard metrics
    NOTIFICATION   = 60 * 2      # 2 minutes  — unread notification count
    SHORT          = 60          # 1 minute   — fast-changing data
    LONG           = 60 * 60     # 1 hour     — rarely changing data


# ─────────────────────────────────────────────
# Cache Key Builder
# ─────────────────────────────────────────────

class CacheKeys:
    """Generates deterministic, versioned cache keys."""

    @staticmethod
    def _hash(data: dict) -> str:
        return hashlib.sha256(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()[:16]

    @staticmethod
    def _version() -> int:
        return cache.get('cache:version:doctor_search', 0)

    @classmethod
    def doctor_search(cls, filters: dict) -> str:
        return f"doctor_search:v{cls._version()}:{cls._hash(filters)}"

    @staticmethod
    def doctor_profile(doctor_id: int) -> str:
        return f"doctor_profile:{doctor_id}"

    @staticmethod
    def clinic_list(filters: dict = None) -> str:
        h = hashlib.sha256(
            json.dumps(filters or {}, sort_keys=True).encode()
        ).hexdigest()[:12]
        return f"clinic_list:{h}"

    @staticmethod
    def hospital_list(filters: dict = None) -> str:
        h = hashlib.sha256(
            json.dumps(filters or {}, sort_keys=True).encode()
        ).hexdigest()[:12]
        return f"hospital_list:{h}"

    @staticmethod
    def dashboard_doctor(doctor_id: int) -> str:
        return f"dashboard:doctor:{doctor_id}"

    @staticmethod
    def dashboard_hospital(hospital_id: int) -> str:
        return f"dashboard:hospital:{hospital_id}"

    @staticmethod
    def dashboard_platform() -> str:
        return "dashboard:platform"

    @staticmethod
    def unread_notifications(user_id: int) -> str:
        return f"unread_notifications:{user_id}"


# ─────────────────────────────────────────────
# Cache Service
# ─────────────────────────────────────────────

class CacheService:
    """Wrapper around Django cache with logging and error handling."""

    TTL = TTL   # Expose TTL constants for convenience

    @staticmethod
    def get(key: str):
        try:
            value = cache.get(key)
            if value is not None:
                logger.debug(f"[Cache] HIT  {key}")
            else:
                logger.debug(f"[Cache] MISS {key}")
            return value
        except Exception as e:
            logger.warning(f"[Cache] GET failed for key={key}: {e}")
            return None

    @staticmethod
    def set(key: str, value, ttl: int = TTL.LONG) -> bool:
        try:
            cache.set(key, value, timeout=ttl)
            logger.debug(f"[Cache] SET  {key} ttl={ttl}s")
            return True
        except Exception as e:
            logger.warning(f"[Cache] SET failed for key={key}: {e}")
            return False

    @staticmethod
    def delete(key: str) -> None:
        try:
            cache.delete(key)
            logger.debug(f"[Cache] DEL  {key}")
        except Exception as e:
            logger.warning(f"[Cache] DELETE failed for key={key}: {e}")

    @staticmethod
    def delete_pattern(pattern: str) -> None:
        """Delete all keys matching a pattern (requires django-redis)."""
        try:
            from django_redis import get_redis_connection
            conn = get_redis_connection("default")
            keys = conn.keys(f"*{pattern}*")
            if keys:
                conn.delete(*keys)
                logger.info(f"[Cache] Deleted {len(keys)} keys matching '{pattern}'")
        except Exception as e:
            logger.warning(f"[Cache] Pattern delete failed for '{pattern}': {e}")

    # ─────────────────────────────────────────────
    # Invalidation helpers
    # ─────────────────────────────────────────────

    @classmethod
    def invalidate_doctor(cls, doctor_id: int) -> None:
        """Invalidate all caches related to a specific doctor."""
        cls.delete(CacheKeys.doctor_profile(doctor_id))
        cls.delete(CacheKeys.dashboard_doctor(doctor_id))
        # Bump doctor search version — invalidates all search caches atomically
        cls._bump_search_version()
        logger.info(f"[Cache] Invalidated doctor caches for doctor_id={doctor_id}")

    @classmethod
    def invalidate_hospital(cls, hospital_id: int) -> None:
        cls.delete(CacheKeys.dashboard_hospital(hospital_id))
        cls.delete_pattern(f"hospital_list:")
        logger.info(f"[Cache] Invalidated hospital caches for hospital_id={hospital_id}")

    @classmethod
    def invalidate_platform(cls) -> None:
        cls.delete(CacheKeys.dashboard_platform())

    @classmethod
    def invalidate_search(cls) -> None:
        """Bump search version — all search caches are invalidated atomically."""
        cls._bump_search_version()

    @staticmethod
    def _bump_search_version() -> None:
        try:
            cache.incr('cache:version:doctor_search')
        except ValueError:
            cache.set('cache:version:doctor_search', 1, timeout=None)

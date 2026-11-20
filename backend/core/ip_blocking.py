"""
CuraBook — IP Blocking System
================================
Provides:
    1. IPBlockMiddleware     — blocks every request from a banned IP (403)
    2. record_failed_attempt — increments failure counter; auto-bans after threshold
    3. block_ip / unblock_ip — manual admin helpers
    4. is_ip_blocked         — check function (Redis-cached, DB fallback)

Configuration (settings):
    IP_BLOCK_CACHE_TTL          = 300   # seconds to cache block status in Redis
    BRUTE_FORCE_BAN_THRESHOLD   = 20    # failed attempts before permanent ban
    BRUTE_FORCE_WINDOW_SECONDS  = 3600  # sliding window for counting failures

Usage in views / throttles:
    from core.ip_blocking import record_failed_attempt
    record_failed_attempt(ip, reason='login_failure')

Usage in middleware (auto-applied — see settings MIDDLEWARE):
    'core.ip_blocking.IPBlockMiddleware'
"""

import logging

from django.core.cache import cache
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone

logger = logging.getLogger('curabook')

# ── Configuration (overridable in settings) ────────────────────────────────────
CACHE_TTL             = getattr(settings, 'IP_BLOCK_CACHE_TTL',         300)
BAN_THRESHOLD         = getattr(settings, 'BRUTE_FORCE_BAN_THRESHOLD',   20)
BAN_WINDOW            = getattr(settings, 'BRUTE_FORCE_WINDOW_SECONDS', 3600)

_CACHE_PREFIX   = 'blocked_ip:'
_FAIL_PREFIX    = 'ip_fail_count:'


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_client_ip(request) -> str:
    """Extract real client IP, respecting X-Forwarded-For behind proxies."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def is_ip_blocked(ip: str) -> bool:
    """
    Check if an IP is currently blocked.
    Redis-cached; DB hit only on cache miss.
    Returns False for IPs not in DB or with expired blocks.
    """
    cache_key = f'{_CACHE_PREFIX}{ip}'
    cached = cache.get(cache_key)

    if cached is not None:
        return bool(cached)

    # Cache miss — query DB
    try:
        from core.models import BlockedIP
        entry = BlockedIP.objects.filter(ip_address=ip).first()
        if entry and entry.is_active():
            cache.set(cache_key, True, CACHE_TTL)
            return True
    except Exception as exc:
        # Never break a request because of a DB error in the block check
        logger.error(f'[IPBlock] DB check failed for {ip}: {exc}')

    cache.set(cache_key, False, CACHE_TTL)
    return False


def block_ip(ip: str, reason: str = '', expires_at=None, blocked_by: str = 'system'):
    """
    Permanently (or temporarily) block an IP.
    Invalidates the Redis cache immediately.
    """
    from core.models import BlockedIP

    entry, created = BlockedIP.objects.update_or_create(
        ip_address=ip,
        defaults={
            'reason':     reason,
            'expires_at': expires_at,
            'blocked_by': blocked_by,
        },
    )
    cache.delete(f'{_CACHE_PREFIX}{ip}')
    action = 'Created' if created else 'Updated'
    logger.warning(f'[IPBlock] {action} block for {ip} — reason: {reason}')
    return entry


def unblock_ip(ip: str):
    """Remove an IP from the block list and clear cache."""
    from core.models import BlockedIP

    deleted_count, _ = BlockedIP.objects.filter(ip_address=ip).delete()
    cache.delete(f'{_CACHE_PREFIX}{ip}')
    cache.delete(f'{_FAIL_PREFIX}{ip}')

    if deleted_count:
        logger.info(f'[IPBlock] Unblocked {ip}')
    return deleted_count > 0


def record_failed_attempt(ip: str, reason: str = 'unknown'):
    """
    Increment the failure counter for an IP.
    Auto-bans when counter reaches BAN_THRESHOLD within BAN_WINDOW.

    Call this from:
        - Login view on authentication failure
        - Any view that detects abuse (e.g. repeated invalid tokens)
    """
    fail_key = f'{_FAIL_PREFIX}{ip}'
    count = cache.get(fail_key, 0) + 1
    cache.set(fail_key, count, BAN_WINDOW)

    logger.debug(f'[IPBlock] {ip} failure #{count} — {reason}')

    if count >= BAN_THRESHOLD:
        block_ip(
            ip=ip,
            reason=f'Auto-banned after {count} failed attempts ({reason})',
            blocked_by='system',
        )
        logger.warning(
            f'[IPBlock] AUTO-BANNED {ip} after {count} failed attempts '
            f'within {BAN_WINDOW}s window. Reason: {reason}'
        )


# ── Middleware ─────────────────────────────────────────────────────────────────

class IPBlockMiddleware:
    """
    Django middleware that blocks requests from banned IPs.

    Returns 403 JSON for any request from a blocked IP.
    Should be placed early in MIDDLEWARE (after SecurityMiddleware,
    before SessionMiddleware).

    Example settings.py:
        MIDDLEWARE = [
            'django.middleware.security.SecurityMiddleware',
            'core.ip_blocking.IPBlockMiddleware',   # ← early, before session
            ...
        ]
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = _get_client_ip(request)

        # Skip block check for health check and internal endpoints
        path = request.path_info
        if path in ('/health/', '/metrics/'):
            return self.get_response(request)

        if is_ip_blocked(ip):
            logger.warning(f'[IPBlock] Blocked request from {ip} → {path}')
            return JsonResponse(
                {
                    'error':   'Access denied.',
                    'detail':  'Your IP address has been blocked due to suspicious activity. '
                               'Contact support if you believe this is an error.',
                    'code':    'IP_BLOCKED',
                },
                status=403,
            )

        return self.get_response(request)

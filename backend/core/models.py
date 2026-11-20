"""
CuraBook — Core Models
========================
Houses infrastructure-level models used across the platform.
"""

from django.db import models
from django.utils import timezone


# ==================================================
# BlockedIP — Permanent IP Ban System
# ==================================================

class BlockedIP(models.Model):
    """
    Stores permanently (or time-limited) blocked IP addresses.

    How it works:
        1. IPBlockMiddleware checks every incoming request against this table
           (cached in Redis — DB hit only on cache miss).
        2. Admin can block IPs manually via Django Admin.
        3. Auto-blocking: after BRUTE_FORCE_BAN_THRESHOLD consecutive 429
           responses from the same IP, it is promoted to a permanent block.
           See core/ip_blocking.py for the auto-promotion logic.

    TTL:
        • expires_at = None  → permanent block (never auto-expires)
        • expires_at = date  → temporary block (auto-unblocked after expiry)

    Cache:
        Blocked IPs are cached in Redis under key `blocked_ip:<ip>`.
        Cache TTL = 5 minutes. On unblock, cache is invalidated immediately.
    """

    ip_address = models.GenericIPAddressField(
        unique=True,
        db_index=True,
        help_text="IPv4 or IPv6 address to block."
    )

    reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Human-readable reason for block (e.g. 'Brute force login — 200 attempts')."
    )

    blocked_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField(
        null=True, blank=True,
        db_index=True,
        help_text="If set, the block expires at this time. Null = permanent."
    )

    blocked_by = models.CharField(
        max_length=50,
        default='system',
        help_text="'system' for auto-blocks, admin username for manual blocks."
    )

    class Meta:
        verbose_name = "Blocked IP"
        verbose_name_plural = "Blocked IPs"
        ordering = ['-blocked_at']
        indexes = [
            models.Index(fields=['ip_address']),
            models.Index(fields=['expires_at']),
        ]

    def is_active(self) -> bool:
        """Returns True if this block is currently in effect."""
        if self.expires_at is None:
            return True  # permanent
        return timezone.now() < self.expires_at

    def __str__(self):
        expiry = f" (expires {self.expires_at:%Y-%m-%d})" if self.expires_at else " (permanent)"
        return f"BlockedIP {self.ip_address}{expiry} — {self.reason[:60]}"

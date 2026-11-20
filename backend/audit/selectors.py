"""
CuraBook — Audit Selectors
============================
All audit log queries centralized here.
"""

from __future__ import annotations
from django.db.models import QuerySet


def get_audit_logs(
    user_id: int = None,
    action: str = None,
    resource_type: str = None,
    ip_address: str = None,
    limit: int = 100,
) -> QuerySet:
    """
    Filtered audit log query.
    Used by: admin dashboard, security monitoring, compliance reports.
    """
    from .models import AuditLog
    qs = AuditLog.objects.select_related("user").order_by("-created_at")

    if user_id:
        qs = qs.filter(user_id=user_id)
    if action:
        qs = qs.filter(action=action)
    if resource_type:
        qs = qs.filter(resource_type=resource_type)
    if ip_address:
        qs = qs.filter(ip_address=ip_address)

    return qs[:limit]


def get_user_audit_trail(user_id: int, days: int = 30) -> QuerySet:
    """Last N days of audit events for a specific user."""
    from .models import AuditLog
    from django.utils import timezone
    from datetime import timedelta

    since = timezone.now() - timedelta(days=days)
    return (
        AuditLog.objects
        .filter(user_id=user_id, created_at__gte=since)
        .order_by("-created_at")
    )


def get_suspicious_activity(ip_address: str, hours: int = 1) -> QuerySet:
    """
    Flag repeated failed actions from same IP.
    Used by: security middleware, rate limit decisions.
    """
    from .models import AuditLog
    from django.utils import timezone
    from datetime import timedelta

    since = timezone.now() - timedelta(hours=hours)
    return (
        AuditLog.objects
        .filter(ip_address=ip_address, created_at__gte=since)
        .order_by("-created_at")
    )

"""
CuraBook — Notifications Selectors
"""

from __future__ import annotations
from django.db.models import QuerySet


def get_notifications_for_user(user, unread_only: bool = False) -> QuerySet:
    from notifications.models import Notification
    qs = Notification.objects.filter(user=user).order_by('-created_at')
    if unread_only:
        qs = qs.filter(is_read=False)
    return qs


def get_unread_count_for_user(user) -> int:
    from notifications.models import Notification
    return Notification.objects.filter(user=user, is_read=False).count()


def get_notification_by_id_for_user(notification_id: int, user):
    from notifications.models import Notification
    return Notification.objects.filter(pk=notification_id, user=user).first()

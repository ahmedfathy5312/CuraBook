"""
CuraBook — Notifications Views (HARDENED)
==========================================
Fixes:
  1. get_queryset uses selectors (no raw ORM)
  2. NotificationPolicy applied for object-level checks
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Notification
from .serializers import NotificationSerializer
from .selectors import (
    get_notifications_for_user,
    get_unread_count_for_user,
    get_notification_by_id_for_user,
)
from .services import mark_all_read_for_user
from core.permissions.policies import NotificationPolicy


class NotificationViewSet(viewsets.ModelViewSet):
    """
    GET  /api/v1/notifications/                  → list (paginated, newest first)
    GET  /api/v1/notifications/{id}/             → detail
    POST /api/v1/notifications/{id}/mark_read/  → mark single as read
    POST /api/v1/notifications/mark_all_read/   → mark all as read
    GET  /api/v1/notifications/unread_count/    → { unread: N }
    """
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated, NotificationPolicy]
    # FIX: allow DELETE for user cleanup, POST/PATCH for mark_read actions.
    # Note: standard POST (create) is intentionally disabled via create() override below.
    # PUT is excluded — notifications are not editable by users.
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def create(self, request, *args, **kwargs):
        """Block direct POST create — notifications are system-generated only."""
        from rest_framework.response import Response
        from rest_framework import status as drf_status
        return Response(
            {'detail': 'Notifications are created by the system only.'},
            status=drf_status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def get_queryset(self):
        """Uses selector — properly scoped to current user only."""
        unread_only = self.request.query_params.get('unread') == 'true'
        notif_type  = self.request.query_params.get('type')

        qs = get_notifications_for_user(self.request.user, unread_only=unread_only)
        if notif_type:
            qs = qs.filter(type=notif_type)
        return qs

    @action(detail=True, methods=['post', 'patch'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        """
        POST/PATCH /api/v1/notifications/{id}/mark_read/
        Mark a single notification as read.
        F-04 FIX: Removed legacy url_path='read' duplicate action.
        Kept 'mark_read' only — matches frontend API.NOTIFICATIONS.MARK_READ constant.
        """
        notif = self.get_object()          # NotificationPolicy checks ownership
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        # API-H05 FIX: Delegate to service with select_for_update to prevent
        # race conditions when two requests arrive simultaneously.
        updated = mark_all_read_for_user(request.user)
        return Response({'marked_read': updated}, status=status.HTTP_200_OK)


    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        count = get_unread_count_for_user(request.user)
        return Response({'unread': count})

    def perform_destroy(self, instance):
        """
        API-M02 FIX: Override DRF's default hard delete.
        Notification inherits SoftDeleteModel — call .delete() for soft delete.
        The soft_delete manager hides these records from all subsequent queries.
        """
        instance.delete()  # SoftDeleteModel.delete() stamps is_deleted=True + deleted_at

    @action(detail=False, methods=['post'], url_path='broadcast', permission_classes=[IsAdminUser])
    def broadcast(self, request):
        """
        POST /api/v1/notifications/broadcast/
        إرسال إشعار جماعي لمجموعة من المستخدمين.
        Body: { target: 'all'|'doctors'|'patients'|'hospitals', title, message }
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()

        target  = request.data.get('target', 'all')
        message = request.data.get('message', '')
        title   = request.data.get('title', 'إشعار من الإدارة')

        if target == 'doctors':
            users = User.objects.filter(is_active=True, is_doctor=True)
        elif target == 'patients':
            users = User.objects.filter(is_active=True, is_patient=True)
        elif target == 'hospitals':
            users = User.objects.filter(is_active=True, hospital_admin=True)
        else:  # 'all'
            users = User.objects.filter(is_active=True)

        notifications = [
            Notification(
                user=user,
                title=title,
                body=message,
                type=Notification.Type.SYSTEM,
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

        return Response(
            {'sent_to': len(notifications), 'message': 'Broadcast sent.'},
            status=status.HTTP_201_CREATED,
        )

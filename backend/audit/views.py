"""
CuraBook — Audit Log API (Admin only)
"""

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/audit/                  → list (admin only, paginated)
    GET /api/v1/audit/{id}/             → detail
    Filter by: actor, action, timestamp
    """
    queryset = AuditLog.objects.select_related('actor', 'content_type').order_by('-timestamp')
    serializer_class    = AuditLogSerializer
    permission_classes  = [IsAdminUser]
    filter_backends     = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields    = ['action', 'actor']
    ordering_fields     = ['timestamp']
    ordering            = ['-timestamp']


# ── Backward-compat class-based views used by audit/urls.py and admin_urls.py ──
# These wrap the ViewSet for use with path() directly (no router needed)

from rest_framework.generics import ListAPIView, RetrieveAPIView
from core.permissions import AuditLogPolicy
from core.pagination import StandardPagination


class AuditLogListView(ListAPIView):
    """GET /api/v1/audit/logs/ — list all audit logs (admins and hospital admins).
    ISSUE-014 FIX: Added StandardPagination so the frontend gets count + paginated data.
    """
    queryset            = AuditLog.objects.select_related('actor', 'content_type').order_by('-timestamp')
    serializer_class    = AuditLogSerializer
    permission_classes  = [AuditLogPolicy]
    pagination_class    = StandardPagination
    filter_backends     = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields    = ['action', 'actor']
    ordering_fields     = ['timestamp']
    ordering            = ['-timestamp']


class AuditLogDetailView(RetrieveAPIView):
    """GET /api/v1/audit/logs/{pk}/ — single audit log entry."""
    queryset            = AuditLog.objects.select_related('actor', 'content_type')
    serializer_class    = AuditLogSerializer
    permission_classes  = [AuditLogPolicy]

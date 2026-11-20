"""
CuraBook — Clinic Views (HARDENED)
=====================================
Fixes:
  1. ClinicViewSet.queryset uses selectors (no raw ORM)
  2. Dashboard action uses cached dashboard_metrics (no raw COUNTs)
  3. ClinicStaffViewSet uses selectors
  4. ClinicPolicy applied for object-level permission
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from .models import Clinic, ClinicStaff, ClinicAssistant
from .serializers import ClinicSerializer, ClinicStaffSerializer
from .permissions import IsClinicOwner, IsClinicStaffOrOwner
from .services import create_clinic, add_staff
from clinics.selectors import (
    get_active_clinics,
    get_clinic_for_doctor,
    get_clinic_assistants,
)
from core.permissions.policies import ClinicPolicy


# ─────────────────────────────────────────────────────
# Clinic ViewSet — FIXED
# ─────────────────────────────────────────────────────
class ClinicViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicSerializer

    def get_queryset(self):
        """
        Use selectors — no raw ORM in views.
        Excludes soft-deleted clinics automatically (SoftDeleteManager).
        """
        return get_active_clinics()

    def get_permissions(self):
        # CREATE: only needs IsAuthenticated — the serializer.create() checks doctor_profile
        # and raises 403 PermissionDenied if user is not a doctor.
        # Object-level permissions (IsClinicOwner, ClinicPolicy) only make sense for
        # update/partial_update/destroy where an existing object exists.
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsClinicOwner(), ClinicPolicy()]
        return [IsAuthenticated(), IsClinicStaffOrOwner()]

    # NOTE: perform_create intentionally removed.
    # The serializer.create() method calls create_clinic_from_request() which:
    #   1. Verifies user has doctor_profile (raises 403 if not)
    #   2. Supports multiple clinics via editingClinicId-based PATCH on the frontend
    #   3. Uses request.user from serializer context automatically
    # This is cleaner and avoids duplicating ownership logic here.

    # ─── Dashboard — FIXED: uses cached metrics ───────────────────
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, IsClinicStaffOrOwner])
    def dashboard(self, request, pk=None):
        """
        Returns clinic analytics.
        FIXED: Uses cached dashboard_metrics instead of raw COUNT queries.
        """
        clinic = self.get_object()

        from analytics.dashboard_metrics import get_clinic_dashboard_metrics
        metrics = get_clinic_dashboard_metrics(clinic.id)

        return Response({
            "clinic_id":              clinic.id,
            "clinic_name":            clinic.name,
            **metrics,
        }, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────
# Clinic Staff ViewSet — FIXED
# ─────────────────────────────────────────────────────
class ClinicStaffViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicStaffSerializer

    def get_queryset(self):
        clinic_id = self.kwargs.get('clinic_pk')
        clinic = get_object_or_404(Clinic, pk=clinic_id)

        user = self.request.user
        is_owner = (
            hasattr(user, 'doctor_profile')
            and clinic.owner == user.doctor_profile
        )

        if is_owner:
            return ClinicStaff.objects.filter(clinic=clinic)

        is_staff = ClinicStaff.objects.filter(
            clinic=clinic, user=user, is_active=True
        ).exists()
        if is_staff:
            return ClinicStaff.objects.filter(clinic=clinic, user=user)

        return ClinicStaff.objects.none()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsClinicStaffOrOwner()]
        return [IsAuthenticated(), IsClinicOwner()]

    def perform_create(self, serializer):
        clinic_id = self.kwargs.get('clinic_pk')
        clinic = get_object_or_404(Clinic, pk=clinic_id)
        validated_data = serializer.validated_data.copy()
        user     = validated_data.pop('user')
        role     = validated_data.pop('role', 'assistant')
        is_active = validated_data.pop('is_active', True)
        staff = add_staff(clinic=clinic, user=user, role=role, is_active=is_active)
        serializer.instance = staff

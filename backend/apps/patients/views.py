"""
CuraBook — Patients Views
==========================
Patient profile + patient-specific appointment views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination
from .models import PatientProfile
from .serializers import PatientProfileSerializer
from .selectors import get_patient_profile
from .permissions import IsPatientOwner


class PatientProfileViewSet(viewsets.ModelViewSet):
    """
    /api/v1/patients/
    Patients see only their own profile. Admins see all.
    """
    serializer_class   = PatientProfileSerializer
    permission_classes = [IsAuthenticated, IsPatientOwner]
    pagination_class   = StandardPagination
    http_method_names  = ['get', 'patch', 'head', 'options']  # no POST/PUT/DELETE

    def get_queryset(self):
        user = self.request.user
        qs = PatientProfile.objects.select_related("user").filter(
            user__is_active=True, user__is_deleted=False
        )
        if getattr(user, "is_platform_admin", False) or user.is_staff:
            return qs
        return qs.filter(user=user)

    def list(self, request, *args, **kwargs):
        """
        GET /api/v1/patients/
        FIX: frontend expects a single profile object not a list.
        Return current patient's profile directly (or 404 if not patient).
        """
        from rest_framework.response import Response
        from rest_framework import status as drf_status
        try:
            profile = PatientProfile.objects.select_related("user").get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except PatientProfile.DoesNotExist:
            # Auto-create if patient has no profile yet
            if getattr(request.user, "is_patient", False):
                profile = PatientProfile.objects.create(user=request.user)
                serializer = self.get_serializer(profile)
                return Response(serializer.data)
            return Response({"detail": "Patient profile not found."}, status=drf_status.HTTP_404_NOT_FOUND)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/v1/patients/ — update own profile."""
        try:
            profile = PatientProfile.objects.get(user=request.user)
        except PatientProfile.DoesNotExist:
            from rest_framework.response import Response
            from rest_framework import status as drf_status
            return Response({"detail": "Profile not found."}, status=drf_status.HTTP_404_NOT_FOUND)
        # Also update User model fields if provided
        user_fields = ("full_name", "phone", "city")
        updated_user_fields = []
        for field in user_fields:
            if field in request.data:
                setattr(request.user, field, request.data[field])
                updated_user_fields.append(field)
        if updated_user_fields:
            request.user.save(update_fields=updated_user_fields)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        from rest_framework.response import Response
        return Response(serializer.data)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """
        GET  /api/v1/patients/me/ — return own profile
        PATCH /api/v1/patients/me/ — update own profile
        FIX: Provides PATCH support at /patients/me/ endpoint.
        """
        try:
            profile = PatientProfile.objects.select_related("user").get(user=request.user)
        except PatientProfile.DoesNotExist:
            from rest_framework.response import Response
            from rest_framework import status as drf_status
            if getattr(request.user, "is_patient", False):
                profile = PatientProfile.objects.create(user=request.user)
            else:
                return Response({"detail": "Patient profile not found."}, status=drf_status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            user_fields = ("full_name", "phone", "city", "username", "email")
            updated_user_fields = []
            for field in user_fields:
                if field in request.data:
                    setattr(request.user, field, request.data[field])
                    updated_user_fields.append(field)
            if updated_user_fields:
                request.user.save(update_fields=updated_user_fields)
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            from rest_framework.response import Response
            return Response(serializer.data)

        # GET
        serializer = self.get_serializer(profile)
        from rest_framework.response import Response
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-appointments")
    def my_appointments(self, request):
        """GET /api/v1/patients/my-appointments/"""
        from appointments.selectors import get_appointments_for_patient
        from appointments.serializers import AppointmentSerializer
        from core.pagination import StandardPagination

        qs = get_appointments_for_patient(request.user)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AppointmentSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"], url_path="medical-history")
    def medical_history(self, request):
        """
        GET /api/v1/patients/medical-history/
        Returns the patient's completed appointments as a medical history summary.
        """
        from appointments.models import Appointment
        from appointments.serializers import AppointmentSerializer
        from core.pagination import StandardPagination

        if not getattr(request.user, "is_patient", False):
            return Response(
                {"detail": "Only patients can access medical history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = (
            Appointment.objects
            .filter(patient=request.user, status=Appointment.Status.COMPLETED)
            .select_related("doctor", "slot", "clinic", "hospital")
            .order_by("-slot__start")
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AppointmentSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

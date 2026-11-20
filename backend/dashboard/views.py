"""
CuraBook — Dashboard Views
===========================
Unified dashboard API for all roles.

Endpoints:
  GET /api/v1/dashboard/           → auto-detects role and returns appropriate data
  GET /api/v1/dashboard/doctor/    → doctor dashboard (doctor role only)
  GET /api/v1/dashboard/assistant/ → assistant dashboard (assistant role only)
  GET /api/v1/dashboard/hospital/  → hospital dashboard (hospital admin only)
  GET /api/v1/dashboard/admin/     → platform admin dashboard (staff/admin only)
  GET /api/v1/dashboard/platform/  → platform stats alias (staff/admin only)
"""

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from core.response import SuccessResponse, ErrorResponse
from core.throttles import DashboardRateThrottle
from .selectors import (
    get_doctor_dashboard_data,
    get_hospital_dashboard_data,
    get_platform_dashboard_data,
    get_assistant_dashboard_data,
)


class MyDashboardView(APIView):
    """
    GET /api/v1/dashboard/
    Returns role-appropriate dashboard data for the current user.
    Auto-detects role — no need to know which specific endpoint to call.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        user = request.user

        if user.is_doctor:
            data = get_doctor_dashboard_data(user)
            role = "doctor"

        elif user.is_assistant:
            data = get_assistant_dashboard_data(user)
            role = "assistant"

        elif getattr(user, "hospital_admin", False):
            try:
                hospital = user.hospital_admin_links.select_related("hospital").first().hospital
                data = get_hospital_dashboard_data(hospital)
                role = "hospital_admin"
            except Exception:
                data = {}
                role = "hospital_admin"

        elif user.is_platform_admin or user.is_staff:
            data = get_platform_dashboard_data()
            role = "platform_admin"

        elif getattr(user, "is_patient", False):
            from appointments.selectors import get_appointments_for_patient
            qs = get_appointments_for_patient(user)
            data = {
                "total_appointments": qs.count(),
                "pending":   qs.filter(status="PENDING").count(),
                "confirmed": qs.filter(status="CONFIRMED").count(),
                "completed": qs.filter(status="COMPLETED").count(),
            }
            role = "patient"

        else:
            data = {}
            role = getattr(user, "current_role", "unknown")

        return SuccessResponse(data={"role": role, **data})


# ─────────────────────────────────────────────────────────────
# Role-specific dashboard endpoints
# Frontend can call these directly instead of the generic one
# ─────────────────────────────────────────────────────────────

class DoctorDashboardView(APIView):
    """GET /api/v1/dashboard/doctor/"""
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        if not getattr(request.user, "is_doctor", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for doctors only.",
                status=status.HTTP_403_FORBIDDEN,
            )
        data = get_doctor_dashboard_data(request.user)
        return SuccessResponse(data={"role": "doctor", **data})


class AssistantDashboardView(APIView):
    """GET /api/v1/dashboard/assistant/"""
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        if not getattr(request.user, "is_assistant", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for assistants only.",
                status=status.HTTP_403_FORBIDDEN,
            )
        data = get_assistant_dashboard_data(request.user)
        return SuccessResponse(data={"role": "assistant", **data})


class HospitalDashboardView(APIView):
    """GET /api/v1/dashboard/hospital/

    B-04 FIX: If the admin manages multiple hospitals, they can pass ?hospital_id=<id>
    to select which hospital to view. Without the param, defaults to first linked hospital.
    Response includes `managed_hospitals` list so the frontend can render a hospital selector.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        if not getattr(request.user, "hospital_admin", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for hospital admins only.",
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            # Fetch ALL hospitals this admin manages
            links = request.user.hospital_admin_links.select_related("hospital").all()
            hospitals = [link.hospital for link in links if link.hospital_id]

            if not hospitals:
                return ErrorResponse(
                    code="NOT_FOUND",
                    message="Hospital data not found.",
                    status=status.HTTP_404_NOT_FOUND,
                )

            # B-04: honour ?hospital_id= selector for multi-hospital admins
            hospital_id = request.query_params.get("hospital_id")
            if hospital_id:
                hospital = next((h for h in hospitals if str(h.id) == str(hospital_id)), None)
                if not hospital:
                    return ErrorResponse(
                        code="NOT_FOUND",
                        message="Hospital not found or you do not have permission to access it.",
                        status=status.HTTP_404_NOT_FOUND,
                    )
            else:
                hospital = hospitals[0]  # Default to first hospital

        except Exception:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Hospital data not found.",
                status=status.HTTP_404_NOT_FOUND,
            )

        data = get_hospital_dashboard_data(hospital)

        # Include lightweight hospital list so frontend can render selector if needed
        managed_hospitals = [
            {"id": h.id, "name": h.name, "public_id": str(h.public_id) if hasattr(h, "public_id") else None}
            for h in hospitals
        ]

        return SuccessResponse(data={
            "role": "hospital_admin",
            "active_hospital": {"id": hospital.id, "name": hospital.name},
            "managed_hospitals": managed_hospitals,
            **data,
        })


class AdminDashboardView(APIView):
    """GET /api/v1/dashboard/admin/"""
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        if not (request.user.is_staff or getattr(request.user, "is_platform_admin", False)):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for platform admins only.",
                status=status.HTTP_403_FORBIDDEN,
            )
        data = get_platform_dashboard_data()
        return SuccessResponse(data={"role": "platform_admin", **data})


class PlatformStatsView(APIView):
    """
    GET /api/v1/dashboard/platform/
    Platform-level stats — admin only. (Alias for /admin/ for backward compatibility)
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [DashboardRateThrottle]

    def get(self, request):
        if not (request.user.is_staff or getattr(request.user, "is_platform_admin", False)):
            return ErrorResponse(
                code="FORBIDDEN",
                message="Not allowed.",
                status=status.HTTP_403_FORBIDDEN,
            )
        data = get_platform_dashboard_data()
        return SuccessResponse(data=data)

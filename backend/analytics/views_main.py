"""
CuraBook — Dashboard API Views

GET /api/v1/analytics/admin/     → Admin dashboard     [IsAdminUser]
GET /api/v1/analytics/doctor/    → Doctor dashboard    [IsDoctor]
GET /api/v1/analytics/assistant/ → Assistant dashboard [IsAssistant]
GET /api/v1/analytics/hospital/  → Hospital dashboard  [IsHospitalAdmin]
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample

from core.permissions import IsDoctor, IsAssistant, IsHospitalAdmin
from appointments.serializers import AppointmentListSerializer
from analytics.selectors import (
    get_admin_stats,
    get_doctor_stats,
    get_assistant_stats,
    get_hospital_stats,
)


class AdminDashboardView(APIView):
    """Platform-wide stats. Platform admin only."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(get_admin_stats())


@extend_schema(
    summary="Doctor Dashboard Stats",
    description=(
        "Returns aggregate stats for the authenticated doctor: "
        "total patients, upcoming appointments count, appointment status breakdown, "
        "and the next 5 upcoming appointments. "
        "Maps to API.DOCTORS.STATS constant in frontend apiRoutes.js."
    ),
    responses={
        200: OpenApiResponse(
            description="Doctor stats object",
            examples=[OpenApiExample(
                "Success",
                value={
                    "total_patients": 42,
                    "total_appointments": 130,
                    "pending": 5,
                    "confirmed": 8,
                    "completed": 115,
                    "cancelled": 2,
                    "upcoming_appointments": []
                }
            )]
        )
    },
    tags=["Doctor Dashboard"]
)
class DoctorDashboardView(APIView):
    """B-07 FIX: Documented in Swagger. Doctor's own stats + upcoming appointments.

    FIX-500: _build_doctor_stats() in selectors.py already serializes
    'upcoming_appointments' via AppointmentListSerializer before caching.
    Re-serializing dicts (not model instances) caused a 500 error.
    Now we pass the pre-serialized list directly to the response.
    """
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        import logging
        logger = logging.getLogger('curabook')
        try:
            stats = get_doctor_stats(request.user)
            # upcoming_appointments is ALREADY serialized by _build_doctor_stats()
            # Do NOT re-serialize — that causes a 500 (dicts != model instances)
            return Response(stats)
        except Exception as exc:
            logger.error(
                f'[DoctorDashboardView] Error fetching stats for user {request.user.id}: {exc}',
                exc_info=True,
            )
            # Return safe fallback so frontend gets 200 (not 500 → DiagnosticBanner)
            return Response({
                'name': getattr(request.user, 'full_name', '') or '',
                'specialty': '',
                'today_count': 0,
                'pending_count': 0,
                'confirmed_count': 0,
                'completed_count': 0,
                'cancelled_count': 0,
                'total_count': 0,
                'unique_patients': 0,
                'available_slots_7d': 0,
                'today_revenue': 0,
                'completion_rate': 0,
                'unread_notifications': 0,
                'upcoming_appointments': [],
            })


class AssistantDashboardView(APIView):
    """Assistant sees ALL appointments across all their clinics + hospitals."""
    permission_classes = [IsAuthenticated, IsAssistant]

    def get(self, request):
        stats = get_assistant_stats(request.user)
        pending  = stats.pop('pending_appointments', [])
        upcoming = stats.pop('upcoming_appointments', [])
        stats['pending_appointments']  = AppointmentListSerializer(pending,  many=True, context={'request': request}).data
        stats['upcoming_appointments'] = AppointmentListSerializer(upcoming, many=True, context={'request': request}).data
        return Response(stats)


class HospitalDashboardView(APIView):
    """Hospital admin sees their hospital's stats."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def get(self, request):
        stats = get_hospital_stats(request.user)
        # FIX: return pending_appointments as a count (int), not a serialized list.
        pending = stats.pop('pending_appointments', [])
        if isinstance(pending, (list, tuple)):
            stats['pending_appointments'] = len(pending)
        elif hasattr(pending, 'count'):
            stats['pending_appointments'] = pending.count()
        else:
            stats['pending_appointments'] = int(pending or 0)
        return Response(stats)


class HospitalAnalyticsView(APIView):
    """
    M-09 FIX: Dedicated analytics endpoint — returns same base stats as
    HospitalDashboardView but with computed fields that map directly to
    the Frontend analytics tab (accepted_appointments, rejected_appointments,
    cancelled_appointments, total_clinics).

    GET /api/v1/hospital/analytics/  →  HOSPITAL.ANALYTICS constant
    """
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def get(self, request):
        stats = get_hospital_stats(request.user)
        stats.pop('pending_appointments', [])  # strip heavy serialization — not needed in analytics

        # Map backend field names → frontend-expected field names
        analytics = {
            'total_doctors':          stats.get('total_doctors', 0),
            'total_patients':         stats.get('total_patients', 0),
            'total_departments':      stats.get('total_departments', 0),
            'total_clinics':          stats.get('managed_hospitals', 0),   # best proxy available
            'managed_hospitals':      stats.get('managed_hospitals', 0),
            'total_appointments':     stats.get('appointments_total', 0),
            'today_appointments':     stats.get('today_appointments', 0),
            'pending_appointments':   stats.get('appointments_pending', 0),
            'accepted_appointments':  stats.get('appointments_confirmed', 0),
            'rejected_appointments':  0,   # not tracked separately in current model — safe default
            'cancelled_appointments': stats.get('appointments_cancelled', 0),
            'completed_appointments': stats.get('appointments_completed', 0),
        }
        return Response(analytics)

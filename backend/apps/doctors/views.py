"""
CuraBook — Doctors Views
=========================
Doctor profile CRUD + doctor-specific actions.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination
from core.response import SuccessResponse, ErrorResponse
from .models import DoctorProfile
from .serializers import DoctorProfileSerializer, DoctorProfileUpdateSerializer, DoctorFullProfileSerializer
from .selectors import get_all_active_doctors, get_doctor_profile_by_user
from .services import update_doctor_profile, toggle_accepting_bookings
from .permissions import IsDoctorOwner


class DoctorProfileViewSet(viewsets.ModelViewSet):
    """
    /api/v1/doctors/
    GET list           → all active doctors (public, paginated)
    GET detail by pk   → /api/v1/doctors/42/
    GET detail by slug → /api/v1/doctors/dr-ahmed-ali/   ← frontend uses this
    PATCH/PUT          → own profile only (doctor only)
    """
    serializer_class   = DoctorProfileSerializer
    permission_classes = [IsAuthenticated, IsDoctorOwner]
    pagination_class   = StandardPagination
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["user__full_name", "user__username", "specialty"]
    ordering_fields    = ["user__full_name", "specialty"]

    def get_queryset(self):
        return get_all_active_doctors()

    def get_object(self):
        """Support both pk (integer) and slug lookup."""
        from .selectors import get_doctor_profile_by_slug
        lookup = self.kwargs.get(self.lookup_field)
        try:
            pk = int(lookup)
            return super().get_object()  # standard pk lookup
        except (ValueError, TypeError):
            # Slug lookup — public, no auth required for GET
            profile = get_doctor_profile_by_slug(lookup)
            if not profile:
                from rest_framework.exceptions import NotFound
                raise NotFound(detail='Doctor not found.')
            self.check_object_permissions(self.request, profile)
            return profile

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return DoctorProfileUpdateSerializer
        if self.action == "retrieve":
            # Full profile with clinics, hospitals, schedules, rating_summary
            return DoctorFullProfileSerializer
        return DoctorProfileSerializer

    @action(detail=False, methods=["get"], url_path="specializations", permission_classes=[])
    def specializations(self, request):
        """
        GET /api/v1/doctors/specializations/
        Returns distinct list of all specializations — used in search filters.
        No auth required (public endpoint).
        """
        from django.db.models import Count
        specs = (
            DoctorProfile.objects
            .filter(user__is_active=True, accepts_booking=True)
            .exclude(specialty="")
            .values("specialty")
            .annotate(count=Count("id"))
            .order_by("specialty")
        )
        return Response({
            "success": True,
            "data": [{"name": s["specialty"], "count": s["count"]} for s in specs],
        })

    @action(detail=True, methods=["get"], url_path="can-review", permission_classes=[IsAuthenticated])
    def can_review(self, request, pk=None):
        """
        GET /api/v1/doctors/{id}/can-review/
        Returns whether the current patient can leave a review for this doctor.
        Requirements: must have a COMPLETED appointment with this doctor, no existing review.
        """
        from appointments.models import Appointment
        from reviews.models import Review

        doctor_profile = self.get_object()

        if not getattr(request.user, "is_patient", False):
            return Response({"can_review": False, "reason": "Only patients can review doctors."})

        completed = Appointment.objects.filter(
            patient=request.user,
            doctor=doctor_profile.user,
            status=Appointment.Status.COMPLETED,
        ).first()

        if not completed:
            return Response({
                "can_review": False,
                "reason": "You need a completed appointment with this doctor to leave a review.",
            })

        already_reviewed = Review.objects.filter(
            patient=request.user,
            appointment=completed,
        ).exists()

        if already_reviewed:
            return Response({
                "can_review": False,
                "reason": "You have already reviewed this appointment.",
            })

        return Response({
            "can_review": True,
            "appointment_id": completed.id,
        })

    @action(detail=True, methods=["get", "post"], url_path="reviews", permission_classes=[IsAuthenticated])
    def reviews(self, request, pk=None):
        """GET/POST /api/v1/doctors/{slug_or_id}/reviews/"""
        from reviews.selectors import get_reviews_for_doctor
        from reviews.serializers import ReviewSerializer
        from core.pagination import StandardPagination
        from rest_framework import status as drf_status

        doctor_profile = self.get_object()

        if request.method == "POST":
            # FIX: frontend POSTs new review to /doctors/{id}/reviews/
            serializer = ReviewSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            serializer.save(doctor=doctor_profile.user, reviewer=request.user)
            return Response(serializer.data, status=drf_status.HTTP_201_CREATED)

        qs = get_reviews_for_doctor(doctor_profile.user)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            ReviewSerializer(page, many=True).data
        )

    @action(detail=True, methods=["get"], url_path="available-slots", permission_classes=[IsAuthenticated])
    def available_slots(self, request, pk=None):
        """
        GET /api/v1/doctors/{slug_or_id}/slots/?from=2024-12-01&to=2024-12-31
        Returns available (unbooked) slots for booking UI.

        AUTO-GENERATE FIX (Bug #9):
        If the doctor has active schedules but no generated slots for the
        requested date range, we auto-generate them on-the-fly before returning.
        This prevents the booking page from showing an empty list just because
        the doctor forgot to press "Generate Slots" manually.
        """
        from search.services import get_available_slots
        from search.serializers import SlotSerializer
        from datetime import date as date_type, timedelta

        doctor_profile = self.get_object()
        # FIX: frontend sends 'date' param; also support 'from'/'to' for backward compat
        date_param = request.query_params.get('date')
        from_date  = request.query_params.get('from') or date_param
        to_date    = request.query_params.get('to')   or date_param

        slots = get_available_slots(
            doctor_user=doctor_profile.user,
            from_date=from_date,
            to_date=to_date,
            location_type=request.query_params.get('location_type'),
            location_id=request.query_params.get('location_id'),
        )

        # AUTO-GENERATE: if no slots found but doctor has active schedules,
        # generate the next 30 days automatically so booking always works.
        if not slots.exists():
            try:
                from scheduling.models import Schedule
                from scheduling.services import generate_slots_from_schedule

                location_type = request.query_params.get('location_type')
                location_id = request.query_params.get('location_id')
                clinic_id = location_id if location_type == 'clinic' else None
                hospital_id = location_id if location_type == 'hospital' else None
                all_active_schedules = Schedule.objects.filter(
                    doctor=doctor_profile.user,
                    is_active=True,
                )
                active_schedules = all_active_schedules
                if clinic_id:
                    active_schedules = active_schedules.filter(clinic_id=clinic_id)
                elif hospital_id:
                    active_schedules = active_schedules.filter(hospital_id=hospital_id)

                if not active_schedules.exists():
                    active_schedules = all_active_schedules

                if active_schedules.exists():
                    today = date_type.today()
                    auto_start = today
                    try:
                        auto_start = date_type.fromisoformat(str(from_date)) if from_date else today
                    except (ValueError, TypeError):
                        auto_start = today
                    auto_end = auto_start + timedelta(days=30)
                    try:
                        if to_date:
                            parsed_end = date_type.fromisoformat(str(to_date))
                            auto_end = max(auto_end, parsed_end)
                    except (ValueError, TypeError):
                        pass

                    for schedule in active_schedules:
                        generated = generate_slots_from_schedule(
                            schedule=schedule,
                            start_date=auto_start,
                            end_date=auto_end,
                            override_existing=False,
                        )
                        if clinic_id or hospital_id:
                            for slot in generated:
                                if slot.is_booked:
                                    continue
                                updates = []
                                if clinic_id and str(slot.clinic_id) != str(clinic_id):
                                    slot.clinic_id = clinic_id
                                    slot.hospital_id = None
                                    updates.extend(['clinic', 'hospital'])
                                elif hospital_id and str(slot.hospital_id) != str(hospital_id):
                                    slot.hospital_id = hospital_id
                                    slot.clinic_id = None
                                    updates.extend(['hospital', 'clinic'])
                                if updates:
                                    slot.save(update_fields=updates)
                    # Re-fetch after auto-generation
                    slots = get_available_slots(
                        doctor_user=doctor_profile.user,
                        from_date=from_date,
                        to_date=to_date,
                        location_type=request.query_params.get('location_type'),
                        location_id=request.query_params.get('location_id'),
                    )
                    if not slots.exists() and (clinic_id or hospital_id):
                        from scheduling.selectors import get_available_slots_for_doctor

                        loose_slots = get_available_slots_for_doctor(
                            doctor=doctor_profile.user,
                            from_date=from_date,
                            to_date=to_date,
                        )
                        for slot in loose_slots:
                            if slot.is_booked:
                                continue
                            if clinic_id:
                                slot.clinic_id = clinic_id
                                slot.hospital_id = None
                                slot.save(update_fields=['clinic', 'hospital'])
                            elif hospital_id:
                                slot.hospital_id = hospital_id
                                slot.clinic_id = None
                                slot.save(update_fields=['hospital', 'clinic'])

                        slots = get_available_slots(
                            doctor_user=doctor_profile.user,
                            from_date=from_date,
                            to_date=to_date,
                            location_type=request.query_params.get('location_type'),
                            location_id=request.query_params.get('location_id'),
                        )
            except Exception:
                # Auto-generate is best-effort — never block the response
                pass

        return SuccessResponse(data=SlotSerializer(slots, many=True).data)

    @action(detail=False, methods=["get"], url_path="my-profile")
    def my_profile(self, request):
        """GET /api/v1/doctors/my-profile/ — own doctor profile"""
        profile = get_doctor_profile_by_user(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Doctor profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = DoctorProfileSerializer(profile, context={"request": request})
        return SuccessResponse(data=serializer.data)

    @action(detail=True, methods=["post"], url_path="toggle-booking")
    def toggle_booking(self, request, pk=None):
        """POST /api/v1/doctors/{id}/toggle-booking/ — toggle accepts_booking"""
        profile = self.get_object()
        if profile.user != request.user:
            return ErrorResponse(
                code="FORBIDDEN",
                message="Not allowed.",
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = toggle_accepting_bookings(profile)
        return SuccessResponse(data={"accepts_booking": profile.accepts_booking})

    @action(detail=False, methods=["get"], url_path="nearby", permission_classes=[])
    def nearby(self, request):
        """
        GET /api/v1/doctors/nearby/?lat=&lng=&radius=&specialty=
        Returns doctors sorted by distance from given coordinates.
        Falls back to full list if no lat/lng provided.
        """
        from math import radians, cos, sin, asin, sqrt
        from .selectors import get_all_active_doctors

        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        radius_km = float(request.query_params.get("radius", 10))
        specialty = request.query_params.get("specialty", "")

        qs = get_all_active_doctors()
        if specialty:
            qs = qs.filter(specialty__icontains=specialty)

        doctors = list(qs.select_related("user", "clinic").values(
            "id", "user__id", "user__first_name", "user__last_name",
            "user__avatar", "specialty", "consultation_fee",
            "experience_years", "rating", "rating_count",
            "accepts_booking", "clinic__lat", "clinic__lng",
            "clinic__address", "clinic__city",
        )[:200])

        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            try:
                dlat = radians(float(lat2) - float(lat1))
                dlon = radians(float(lon2) - float(lon1))
                a = sin(dlat/2)**2 + cos(radians(float(lat1))) * cos(radians(float(lat2))) * sin(dlon/2)**2
                return R * 2 * asin(sqrt(a))
            except Exception:
                return 9999

        if lat and lng:
            for d in doctors:
                d["distance_km"] = round(haversine(lat, lng, d["clinic__lat"] or 30.0, d["clinic__lng"] or 31.0), 1)
            doctors = [d for d in doctors if d["distance_km"] <= radius_km]
            doctors.sort(key=lambda d: d["distance_km"])
        else:
            for d in doctors:
                d["distance_km"] = None

        # Normalize output shape
        results = []
        for d in doctors:
            results.append({
                "id": d["user__id"],
                "public_id": d["id"],
                "full_name": f"{d['user__first_name']} {d['user__last_name']}".strip(),
                "avatar": d["user__avatar"],
                "specialty": d["specialty"],
                "consultation_fee": d["consultation_fee"],
                "experience_years": d["experience_years"],
                "rating": d["rating"],
                "rating_count": d["rating_count"],
                "accepts_booking": d["accepts_booking"],
                "distance_km": d["distance_km"],
                "clinic_address": d["clinic__address"],
                "clinic_city": d["clinic__city"],
                "lat": d["clinic__lat"],
                "lng": d["clinic__lng"],
            })

        return SuccessResponse(data={"results": results, "count": len(results)})

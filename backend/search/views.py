"""
CuraBook — Search API Views

GET /api/v1/search/doctors/   → doctor search with filters + Redis cache
GET /api/v1/search/           → global search (doctors + clinics + hospitals)
GET /api/v1/search/slots/     → available slots for a doctor
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.viewsets import ReadOnlyModelViewSet
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .services import (
    search_doctors,
    search_all,
    get_available_slots,
    get_available_slots_for_request,
    log_search,
)
from core.throttles import SearchRateThrottle, AuthSearchRateThrottle
from .serializers import (
    DoctorSearchSerializer,
    SearchResultSerializer,
    SlotSerializer,
    SearchLogSerializer,
)
from .models import SearchLog
# F-07 FIX: Use StandardPagination from core to ensure consistent response envelope
# across all endpoints. Removed local SearchPagination class.
from core.pagination import StandardPagination as SearchPagination


# ─────────────────────────────────────────────────────
# Doctor Search  ← main search endpoint
# ─────────────────────────────────────────────────────
@extend_schema(
    tags=["Search"],
    summary="Search doctors by name, specialty, city, price, gender, availability",
    parameters=[
        OpenApiParameter("q",            OpenApiTypes.STR,   description="Text search — name / specialty / bio"),
        OpenApiParameter("specialty",    OpenApiTypes.STR,   description="Filter by specialty name"),
        OpenApiParameter("city",         OpenApiTypes.STR,   description="Filter by city"),
        OpenApiParameter("gender",       OpenApiTypes.STR,   description="male | female"),
        OpenApiParameter("min_fee",      OpenApiTypes.FLOAT, description="Minimum consultation fee"),
        OpenApiParameter("max_fee",      OpenApiTypes.FLOAT, description="Maximum consultation fee"),
        OpenApiParameter("rating",       OpenApiTypes.FLOAT, description="Minimum average rating (0–5)"),
        OpenApiParameter("availability", OpenApiTypes.STR,   description="today | this_week | this_month"),
        OpenApiParameter("sort",         OpenApiTypes.STR,   description="rating_desc | fee_asc | fee_desc | name_asc"),
        OpenApiParameter("page",         OpenApiTypes.INT,   description="Page number"),
        OpenApiParameter("page_size",    OpenApiTypes.INT,   description="Results per page (max 50)"),
    ],
    responses={200: DoctorSearchSerializer(many=True)},
)
class DoctorSearchView(APIView):
    """
    GET /api/v1/search/doctors/
    ?q=           text search (name, specialty, bio)
    ?specialty=   filter by specialty
    ?city=        filter by city
    ?available=1  only doctors with open slots
    ?min_rating=  minimum average rating (1–5)
    ?max_fee=     maximum consultation fee
    ?min_fee=     minimum consultation fee
    ?sort=        sort order: rating_desc | experience_desc | fee_asc | fee_desc (FIX BUG-06)
    """
    permission_classes = [AllowAny]
    # Security FIX: rate-limit search (100/min anon, 200/min auth) — prevents scraping
    throttle_classes   = [SearchRateThrottle, AuthSearchRateThrottle]

    def get(self, request):
        query          = request.query_params.get('q', '').strip()
        # FIX B-04: Accept both ?specialty= (backend canonical) and ?specialization= (frontend alias).
        # The frontend useDoctorSearch.js sends ?specialty= already, but older versions and
        # direct API consumers may send ?specialization=. Accept both to prevent broken search.
        specialty      = (
            request.query_params.get('specialty', '').strip() or
            request.query_params.get('specialization', '').strip()
        )
        # Also accept ?location= as alias for ?city= for forward-compatibility
        city           = (
            request.query_params.get('city', '').strip() or
            request.query_params.get('location', '').strip()
        )
        # FIX: Accept both 'available=1' and 'availability=today/this_week/this_month'
        availability_param = request.query_params.get('availability', '').strip()
        only_available = (
            request.query_params.get('available') == '1'
            or availability_param in ('today', 'this_week', 'this_month', 'available')
        )
        # BUG-FIX #6: when sort=available, also treat as only_available=True with today range
        # Pass availability_param to selector so it knows exact range requested
        # ('today' → today only; 'this_week' / 'this_month' / '' → any future slot)
        # API-02 FIX: accept both 'min_rating' (backend canonical) and 'rating' (frontend alias)
        min_rating     = request.query_params.get('min_rating') or request.query_params.get('rating')
        # FIX: accept both 'max_fee' (backend canonical) and 'price_max' (frontend alias)
        max_fee        = request.query_params.get('max_fee') or request.query_params.get('price_max')
        min_fee        = request.query_params.get('min_fee')
        # FIX BUG-06: add sort parameter
        # FIX: Added 'available' and 'nearest' as valid sort values
        VALID_SORT_OPTIONS = ('rating_desc', 'experience_desc', 'fee_asc', 'fee_desc', 'available', 'nearest', 'name_asc')
        sort = request.query_params.get('sort', '').strip()
        if sort and sort not in VALID_SORT_OPTIONS:
            return Response(
                {'detail': f'sort must be one of: {", ".join(VALID_SORT_OPTIONS)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if min_rating:
            try:
                min_rating = float(min_rating)
            except ValueError:
                return Response(
                    {'detail': 'min_rating must be a number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if max_fee:
            try:
                max_fee = float(max_fee)
            except ValueError:
                return Response(
                    {'detail': 'max_fee must be a number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if min_fee:
            try:
                min_fee = float(min_fee)
            except ValueError:
                return Response(
                    {'detail': 'min_fee must be a number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # FIX: use queryset directly (not cached dicts) so serializer gets model objects
        from search.selectors import get_doctor_search_queryset
        SORT_MAP = {
            'rating_desc':     '-avg_rating',
            'experience_desc': '-experience_years',
            'fee_asc':         'consultation_fee',
            'fee_desc':        '-consultation_fee',
            'name_asc':        'user__full_name',
            # 'available' and 'nearest' handled via only_available flag / default ordering
        }
        # FIX: 'available' sort → set only_available; 'nearest' → use GPS coords
        if sort == 'available':
            only_available = True

        # BUG-FIX #6 (الأقرب): read lat/lng sent by the frontend geolocation API
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        user_lat, user_lng = None, None
        if lat and lng:
            try:
                user_lat = float(lat)
                user_lng = float(lng)
            except ValueError:
                pass  # invalid coords → fall back to rating sort

        # FIX #11: read hospital_id to filter doctors by hospital
        hospital_id_raw = request.query_params.get('hospital_id', '').strip()
        hospital_id = None
        if hospital_id_raw:
            try:
                hospital_id = int(hospital_id_raw)
            except ValueError:
                return Response(
                    {'detail': 'hospital_id must be a number'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        doctors_qs = get_doctor_search_queryset(
            query=query,
            specialty=specialty,
            city=city,
            only_available=only_available,
            availability_range=availability_param,   # BUG-FIX #6: pass exact range
            min_rating=min_rating,
            max_fee=max_fee,
            min_fee=min_fee,
            hospital_id=hospital_id,
            user_lat=user_lat,
            user_lng=user_lng,
        )
        if sort and sort in SORT_MAP:
            doctors_qs = doctors_qs.order_by(SORT_MAP[sort])
        elif sort == 'nearest':
            if user_lat is not None and user_lng is not None:
                # BUG-FIX #6: distance annotation added in get_doctor_search_queryset
                # when user_lat/user_lng are provided — order by it here
                try:
                    doctors_qs = doctors_qs.order_by('distance_km', '-avg_rating')
                except Exception:
                    doctors_qs = doctors_qs.order_by('-avg_rating')
            else:
                # No GPS coords available (denied/unavailable) → fall back to rating
                doctors_qs = doctors_qs.order_by('-avg_rating')

        # Log search (async-friendly — no blocking)
        if query or specialty:
            log_search(
                query=query or specialty,
                request=request,
                search_type=SearchLog.SearchType.DOCTOR,
            )

        paginator = SearchPagination()
        page = paginator.paginate_queryset(doctors_qs, request)
        serializer = DoctorSearchSerializer(
            page, many=True, context={'request': request}
        )
        return paginator.get_paginated_response(serializer.data)


# ─────────────────────────────────────────────────────
# Global Search
# ─────────────────────────────────────────────────────
class GlobalSearchView(APIView):
    """
    GET /api/v1/search/?q=<query>&city=<city>&specialty=<specialty>
    Returns mix of doctors, clinics, hospitals.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        filters = {
            'specialty':      request.query_params.get('specialty', ''),
            'city':           request.query_params.get('city', ''),
            'only_available': request.query_params.get('available') == '1',
        }

        results = search_all(query, filters)
        log_search(query=query, request=request)

        paginator = SearchPagination()
        page = paginator.paginate_queryset(results, request)
        serializer = SearchResultSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


# ─────────────────────────────────────────────────────
# Available Slots for a Doctor
# ─────────────────────────────────────────────────────
class DoctorSlotsView(APIView):
    """
    GET /api/v1/search/slots/?doctor_id=1&from=2024-12-01&location_type=clinic&location_id=1
    Returns available (unbooked) slots for a doctor.
    """
    permission_classes = [AllowAny]

    def _resolve_doctor(self, doctor_id):
        from django.contrib.auth import get_user_model
        from apps.doctors.models import DoctorProfile

        User = get_user_model()
        doctor = User.objects.filter(
            id=doctor_id,
            is_doctor=True,
            is_deleted=False,
        ).first()
        if doctor:
            return doctor

        profile = DoctorProfile.objects.select_related('user').filter(
            id=doctor_id,
            user__is_doctor=True,
            user__is_deleted=False,
        ).first()
        return profile.user if profile else None

    def get(self, request):
        doctor_id = request.query_params.get('doctor_id') or request.query_params.get('doctor')
        if not doctor_id:
            return Response({'detail': 'doctor_id is required'}, status=400)

        doctor = self._resolve_doctor(doctor_id)
        if not doctor:
            return Response({'detail': 'Doctor not found'}, status=404)

        from_date     = request.query_params.get('from')
        to_date       = request.query_params.get('to')
        location_type = request.query_params.get('location_type')
        location_id   = request.query_params.get('location_id')
        clinic_id     = request.query_params.get('clinic_id') or request.query_params.get('clinic')
        hospital_id   = request.query_params.get('hospital_id') or request.query_params.get('hospital')

        slots = get_available_slots_for_request(
            doctor_user=doctor,
            from_date=from_date,
            to_date=to_date,
            location_type=location_type,
            location_id=location_id,
            clinic_id=clinic_id,
            hospital_id=hospital_id,
        )

        paginator = SearchPagination()
        page = paginator.paginate_queryset(slots, request)
        return paginator.get_paginated_response(
            SlotSerializer(page, many=True).data
        )


# ─────────────────────────────────────────────────────
# Search Logs (Admin only)
# ─────────────────────────────────────────────────────
class SearchLogViewSet(ReadOnlyModelViewSet):
    queryset = SearchLog.objects.all().order_by('-created_at')
    serializer_class   = SearchLogSerializer
    permission_classes = [IsAdminUser]

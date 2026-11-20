"""
CuraBook — Locations API
=========================
GET /api/v1/locations/cities/  → distinct list of cities from City model + live data
Used by the search filters UI (no auth required).
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache


class CitiesListView(APIView):
    """
    GET /api/v1/locations/cities/
    Returns a sorted, deduplicated list of all cities where doctors,
    hospitals, or clinics are active. Falls back to dynamic aggregation.
    Cached for 10 minutes in Redis.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        CACHE_KEY = "locations:cities"
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return Response({"success": True, "data": cached})

        cities = set()

        # 1. Cities from the City model (seeded reference data)
        try:
            from locations.models import City
            city_qs = (
                City.objects
                .filter(is_active=True)
                .values_list("name_en", flat=True)
            )
            cities.update(c.strip().title() for c in city_qs if c)
        except Exception:
            pass

        # 2. Cities from active doctors (via User.city) — live data
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            doctor_cities = (
                User.objects
                .filter(is_doctor=True, is_active=True, is_deleted=False)
                .exclude(city__isnull=True)
                .exclude(city="")
                .values_list("city", flat=True)
                .distinct()
            )
            cities.update(c.strip().title() for c in doctor_cities if c)
        except Exception:
            pass

        # 3. Cities from active hospitals
        try:
            from hospital.models import Hospital
            hospital_cities = (
                Hospital.objects
                .filter(is_active=True)
                .exclude(city__isnull=True)
                .exclude(city="")
                .values_list("city", flat=True)
                .distinct()
            )
            cities.update(c.strip().title() for c in hospital_cities if c)
        except Exception:
            pass

        # 4. Cities from active clinics
        try:
            from clinics.models import Clinic
            clinic_cities = (
                Clinic.objects
                .filter(is_active=True)
                .exclude(city__isnull=True)
                .exclude(city="")
                .values_list("city", flat=True)
                .distinct()
            )
            cities.update(c.strip().title() for c in clinic_cities if c)
        except Exception:
            pass

        sorted_cities = sorted(cities)

        # Cache for 10 minutes
        cache.set(CACHE_KEY, sorted_cities, timeout=60 * 10)

        return Response({"success": True, "data": sorted_cities})

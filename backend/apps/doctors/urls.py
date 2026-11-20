from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import DoctorProfileViewSet

# ✅ FIX: Import DoctorSearchView to add /doctors/search/ alias
# Frontend apiRoutes.js uses DOCTORS.SEARCH = '/doctors/search/'
# Backend search is at /search/doctors/ — we add an alias here so both work
from search.views import DoctorSearchView

app_name = "doctors"

router = DefaultRouter()
router.register(r"", DoctorProfileViewSet, basename="doctor")

urlpatterns = [
    # ✅ NEW: /api/v1/doctors/search/ — alias for /api/v1/search/doctors/
    # Matches frontend apiRoutes.js DOCTORS.SEARCH constant
    path("search/", DoctorSearchView.as_view(), name="doctor-search-alias"),

    path("", include(router.urls)),
]

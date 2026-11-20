# clinics/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from rest_framework_nested import routers
from .views import ClinicViewSet, ClinicStaffViewSet

# ==================================================
# App namespace
# ==================================================
app_name = "clinics"

# ==================================================
# Main router for Clinics
# ==================================================
router = DefaultRouter()
# FIX: was r'clinics' → caused /clinics/clinics/ double prefix
# main urls.py already prefixes with /api/v1/clinics/
router.register(r'', ClinicViewSet, basename='clinic')

# ==================================================
# Nested router for Clinic Staff
# Endpoint: /clinics/{clinic_pk}/staff/
# ==================================================
staff_router = routers.NestedDefaultRouter(router, r'', lookup='clinic')
staff_router.register(r'staff', ClinicStaffViewSet, basename='clinic-staff')

# ==================================================
# URL Patterns
# ==================================================
urlpatterns = [
    path('', include(router.urls)),       # /clinics/
    path('', include(staff_router.urls)), # /clinics/{clinic_pk}/staff/
]

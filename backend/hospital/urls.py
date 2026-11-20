from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter

from .views import (
    HospitalViewSet,
    DepartmentViewSet,
    HospitalDoctorViewSet,
    HospitalStaffViewSet,
    HospitalDocumentViewSet,
    HospitalSlotViewSet,
    HospitalAnalyticsViewSet,
    PlatformAnalyticsView,
    HospitalReportsView,
    HospitalDoctorRegistrationView,
)

app_name = 'hospital'

# ==================================================
# Main Router for Hospital Module
# ==================================================
router = DefaultRouter()

router.register('',HospitalViewSet,basename='hospital')          # ✅ FIX: was 'hospitals' → caused /hospitals/hospitals/ double prefix

router.register('departments',DepartmentViewSet,basename='department')

router.register('doctors',HospitalDoctorViewSet,basename='hospital-doctor')

router.register('staff',HospitalStaffViewSet,basename='hospital-staff')

router.register('documents',HospitalDocumentViewSet,basename='hospital-document')

router.register('analytics',HospitalAnalyticsViewSet,basename='hospital-analytics')


# ==================================================
# Hospital Slots (Custom Route)
# ==================================================
hospital_slot_list = HospitalSlotViewSet.as_view({'get': 'list'})

# ==================================================
# URL Patterns
# ==================================================
urlpatterns = [
    path('', include(router.urls)),

    path(
        'hospitals/<int:hospital_id>/slots/',
        hospital_slot_list,
        name='hospital-slots'
    ),

    path(
        'admin/analytics/',
        PlatformAnalyticsView.as_view(),
        name='platform-analytics'
    ),

    # Bug #4 Fix: Real CSV download endpoints for hospital analytics reports
    path(
        'hospitals/reports/<str:report_type>/',
        HospitalReportsView.as_view(),
        name='hospital-reports-download',
    ),

    # Bug #1 Fix: Register a new doctor and link to hospital immediately
    path(
        'hospitals/<int:hospital_id>/doctors/register/',
        HospitalDoctorRegistrationView.as_view(),
        name='hospital-doctors-register',
    ),
    # Alias without hospital_id (hospital inferred from admin's account)
    path(
        'doctors/register/',
        HospitalDoctorRegistrationView.as_view(),
        name='hospital-doctors-register-simple',
    ),
]

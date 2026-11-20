"""
CuraBook — URL Configuration
==============================
All API endpoints versioned under /api/v1/

Domain Map:
  /api/v1/auth/          → apps.accounts
  /api/v1/doctors/       → apps.doctors
  /api/v1/patients/      → apps.patients
  /api/v1/assistants/    → apps.assistants
  /api/v1/clinics/       → clinics
  /api/v1/hospitals/     → hospital
  /api/v1/appointments/  → appointments
  /api/v1/schedules/     → scheduling
  /api/v1/notifications/ → notifications
  /api/v1/reviews/       → reviews
  /api/v1/search/        → search
  /api/v1/analytics/     → analytics
  /api/v1/audit/         → audit
  /api/v1/dashboard/     → dashboard
  /api/v1/chat/          → chat (In-App Messaging)

Frontend-Contract Aliases (match apiRoutes.js exactly):
  /api/v1/admin/*        → admin stats + audit logs
  /api/v1/hospital/*     → hospital admin views
  /api/v1/doctor/*       → doctor dashboard views

Monitoring:
  /metrics               → Prometheus
  /api/v1/health/        → Health checks
  /api/v1/docs/          → Swagger UI
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
# FIX B-02: Replace unsafe __import__() calls with standard top-level imports.
# __import__() is fragile — it bypasses Django's app registry import order
# and makes the file harder to read. Standard imports are idiomatic Python.
from apps.assistants.views import (
    AssistantUnifiedAppointmentsView,
    AssistantScheduleView,
    AssistantShiftView,
    AssistantProfileViewSet,
    AssistantPatientsView,           # HIGH-04 FIX
    AssistantDoctorsView,            # FIX: doctors list for shift modal
    AssistantMeView,                 # FIX: real permissions for settings page
)

API_V1 = "api/v1/"

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # ── User Domain APIs ──────────────────────────────────────────
    path(f"{API_V1}auth/",         include("apps.accounts.urls",    namespace="accounts")),
    path(f"{API_V1}doctors/",      include("apps.doctors.urls",     namespace="doctors")),
    path(f"{API_V1}patients/",     include("apps.patients.urls",    namespace="patients")),
    path(f"{API_V1}assistants/",   include("apps.assistants.urls",  namespace="assistants")),
    path(f"{API_V1}departments/",  include("apps.departments.urls", namespace="departments")),
    path(f"{API_V1}dashboard/",    include("dashboard.urls",        namespace="dashboard")),

    # ── Assistant Endpoints (explicit frontend contract) ─────────────────────
    # GET /api/v1/assistant/appointments/ — all appointments across all workplaces
    path(f"{API_V1}assistant/appointments/",
         AssistantUnifiedAppointmentsView.as_view(),
         name="assistant-appointments"),
    # GET /api/v1/assistant/schedule/ — assistant's working schedule
    path(f"{API_V1}assistant/schedule/",
         AssistantScheduleView.as_view(),
         name="assistant-schedule"),
    # CRUD /api/v1/assistant/shifts/ — personal shift management
    path(f"{API_V1}assistant/shifts/",
         AssistantShiftView.as_view(),
         name="assistant-shifts-list"),
    path(f"{API_V1}assistant/shifts/<int:shift_id>/",
         AssistantShiftView.as_view(),
         name="assistant-shifts-detail"),
    # GET /api/v1/assistant/patients/ — unique patients from assistant's appointments (HIGH-04)
    path(f"{API_V1}assistant/patients/",
         AssistantPatientsView.as_view(),
         name="assistant-patients"),
    # GET /api/v1/assistant/doctors/ — doctors in assistant's workplaces (for shift modal autocomplete)
    path(f"{API_V1}assistant/doctors/",
         AssistantDoctorsView.as_view(),
         name="assistant-doctors"),
    # GET /api/v1/assistant/me/ — current assistant's profile + real permissions
    path(f"{API_V1}assistant/me/",
         AssistantMeView.as_view(),
         name="assistant-me"),
    # GET /api/v1/assistant/workplaces/ — alias for /assistants/my-workplaces/
    path(f"{API_V1}assistant/workplaces/",
         AssistantProfileViewSet.as_view({"get": "my_workplaces"}),
         name="assistant-workplaces"),

    # ── Medical Facility APIs ─────────────────────────────────────
    path(f"{API_V1}clinics/",      include("clinics.urls",    namespace="clinics")),
    path(f"{API_V1}hospitals/",    include("hospital.urls",   namespace="hospital")),

    # ── Booking Lifecycle API ─────────────────────────────────────
    path(f"{API_V1}appointments/", include("appointments.urls", namespace="appointments")),

    # ── Scheduling API ────────────────────────────────────────────
    path(f"{API_V1}schedules/",    include("scheduling.urls",  namespace="scheduling")),

    # ── Supporting Feature APIs ───────────────────────────────────
    path(f"{API_V1}notifications/", include("notifications.urls", namespace="notifications")),
    path(f"{API_V1}reviews/",       include("reviews.urls",       namespace="reviews")),
    path(f"{API_V1}search/",        include("search.urls",        namespace="search")),
    path(f"{API_V1}analytics/",     include("analytics.urls",     namespace="analytics")),
    path(f"{API_V1}audit/",         include("audit.urls",         namespace="audit")),

    # ── Locations ─────────────────────────────────────────────────
    path(f"{API_V1}locations/",     include("locations.urls",     namespace="locations")),  # ✅ NEW

    # ── Prescriptions ─────────────────────────────────────────────
    path(f"{API_V1}prescriptions/", include("prescriptions.urls", namespace="prescriptions")),  # ✅ NEW

    # ── Contact Us  (FIX B-11) ────────────────────────────────────────────
    # Frontend Contact.jsx posts to /api/v1/contact/ — was unregistered (404).
    path(f"{API_V1}contact/",       include("contact.urls",        namespace="contact")),
    path(f"{API_V1}reports/",       include("reports.urls",        namespace="reports")),

    # ── Health Monitoring ─────────────────────────────────────────
    path(f"{API_V1}health/",        include("health.urls",        namespace="health")),

    # ── Billing & Subscriptions ────────────────────────────────────────────────
    path(f"{API_V1}billing/",       include("billing.urls",       namespace="billing")),

    # ── Multi-Tenancy ──────────────────────────────────────────────────────────
    path(f"{API_V1}video/",         include("video.urls",         namespace="video")),
    path(f"{API_V1}chat/",          include("chat.urls",           namespace="chat")),   # ✅ In-App Chat
    path(f"{API_V1}tenant/",        include("tenants.urls",       namespace="tenants")),

    # ── Frontend-Contract Aliases ─────────────────────────────────────────────
    # apiRoutes.js uses these short prefixes — we map them to analytics views.
    # /api/v1/admin/stats/          → AdminDashboardView
    # /api/v1/admin/audit-logs/     → AuditLogListView
    # /api/v1/admin/hospitals/      → Hospital list for admin
    # /api/v1/admin/doctors/        → Doctor list for admin
    # /api/v1/hospital/overview/    → HospitalDashboardView
    # /api/v1/hospital/analytics/   → HospitalDashboardView (analytics tab)
    # /api/v1/hospital/appointments/→ filtered appointments
    # /api/v1/hospital/doctors/     → hospital's doctors
    # /api/v1/doctor/stats/         → DoctorDashboardView
    # /api/v1/doctor/today-schedule/→ today's slots
    # /api/v1/doctor/appointments/  → doctor's appointments
    # /api/v1/doctor/patients/      → doctor's patients
    path(f"{API_V1}admin/",         include("analytics.admin_urls",    namespace="admin_api")),
    path(f"{API_V1}hospital/",      include("analytics.hospital_urls", namespace="hospital_api")),
    path(f"{API_V1}doctor/",        include("analytics.doctor_urls",   namespace="doctor_api")),

    # ── Prometheus Metrics ────────────────────────────────────────
    path("", include("django_prometheus.urls")),  # registers /metrics endpoint

    # ── OpenAPI / Swagger ─────────────────────────────────────────
    path(f"{API_V1}schema/",     SpectacularAPIView.as_view(),                      name="schema"),
    path(f"{API_V1}docs/",       SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path(f"{API_V1}docs/redoc/", SpectacularRedocView.as_view(url_name="schema"),   name="redoc"),
]

# ✅ FIX #31: django-silk — only available in dev/staging (when silk is installed)
from django.conf import settings  # noqa: E402
if settings.DEBUG:
    try:
        urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]
    except ImportError:
        pass  # silk not installed — skip silently

# ── Dev Static & Media serving (fallback when WhiteNoise is not active) ──────
# Django's runserver serves static files automatically, but Daphne (ASGI) does
# not.  Adding these URL patterns ensures /static/ and /media/ are always
# reachable in DEBUG mode — whether running via runserver or Daphne.
# WhiteNoise (inserted in dev.py) is the primary handler; this is the fallback.
if settings.DEBUG:
    from django.conf.urls.static import static as _static  # noqa: E402
    urlpatterns += _static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += _static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)

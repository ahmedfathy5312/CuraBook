from django.urls import path
from .views import (
    MyDashboardView,
    PlatformStatsView,
    DoctorDashboardView,
    AssistantDashboardView,
    HospitalDashboardView,
    AdminDashboardView,
)

app_name = "dashboard"

urlpatterns = [
    # ── Auto-detect role (generic) ────────────────────────────
    path("",            MyDashboardView.as_view(),       name="my-dashboard"),

    # ── Role-specific endpoints (frontend uses these directly) ─
    path("doctor/",     DoctorDashboardView.as_view(),    name="doctor-dashboard"),
    path("assistant/",  AssistantDashboardView.as_view(), name="assistant-dashboard"),
    path("hospital/",   HospitalDashboardView.as_view(),  name="hospital-dashboard"),
    path("admin/",      AdminDashboardView.as_view(),     name="admin-dashboard"),

    # ── Platform stats (alias for /admin/) ────────────────────
    path("platform/",   PlatformStatsView.as_view(),      name="platform-stats"),
]

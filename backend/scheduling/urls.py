"""
CuraBook — Scheduling URLs

Endpoints:
  GET/POST/PUT/DELETE /api/v1/schedules/              → ScheduleViewSet (doctor's weekly schedule)
  GET/POST/PUT/DELETE /api/v1/schedules/{id}/generate-slots/ → generate slots from one schedule
  GET/POST/PUT/DELETE /api/v1/schedules/working-hours/       → alias for ScheduleViewSet (backward compat)
  GET/POST/PUT/DELETE /api/v1/schedules/timeoffs/            → TimeOffViewSet
  GET/POST/PUT/DELETE /api/v1/schedules/slots/               → GeneratedSlotViewSet
  POST                /api/v1/schedules/slots/generate/      → generate from ALL active schedules
  POST                /api/v1/schedules/blocked/             → BlockedSlotViewSet
  GET                 /api/v1/schedules/public/slots/        → PatientSlotSearch
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter

from .views import (
    ScheduleViewSet,
    WorkingHoursViewSet,   # backward-compat alias
    TimeOffViewSet,
    GeneratedSlotViewSet,
    PublicSlotListView,
    BlockedSlotViewSet,
)

app_name = "scheduling"

router = DefaultRouter()
# ── BUG #2 FIX ─────────────────────────────────────────────────────────────
# ScheduleViewSet is registered at r'' (empty prefix), which causes DRF
# SimpleRouter to generate a detail URL pattern  ^(?P<pk>[^/.]+)/$  that
# matches ANY path segment — including 'slots', 'timeoffs', and 'blocked'.
# Django resolves URL patterns top-down, so the catch-all ScheduleViewSet
# detail pattern intercepted POST /schedules/slots/ before the
# GeneratedSlotViewSet list URL was ever checked, returning
# "Method POST not allowed" on slot creation / slot generation.
#
# Fix: register named-prefix ViewSets FIRST so their specific list URLs
# (^slots/$, ^timeoffs/$, ^blocked/$) are checked before the generic
# ^(?P<pk>[^/.]+)/$ pattern from ScheduleViewSet.
router.register(r'working-hours', WorkingHoursViewSet,  basename='working-hours')  # backward compat
router.register(r'timeoffs',      TimeOffViewSet,        basename='timeoffs')
router.register(r'slots',         GeneratedSlotViewSet,  basename='slots')
router.register(r'blocked',       BlockedSlotViewSet,    basename='blocked-slots')
router.register(r'',              ScheduleViewSet,      basename='schedule')       # /schedules/ — LAST (catch-all detail)

urlpatterns = [
    # Public slot browsing (patient)
    path('public/slots/', PublicSlotListView.as_view(), name='public-slots'),

    # All router URLs
    path('', include(router.urls)),
]

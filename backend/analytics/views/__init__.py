"""
analytics/views/__init__.py

The canonical view implementations live in analytics/views.py (the module).
This package __init__ re-exports them so that both:
  from analytics.views import AdminDashboardView   # package import
  from analytics.views.doctor_views import ...     # sub-module import
work correctly.

Root cause: Python resolves `analytics.views` to this DIRECTORY (package)
before the sibling `analytics/views.py` module. Re-exporting here fixes the
ImportError without moving any files.
"""
from analytics.views_main import (
    AdminDashboardView,
    DoctorDashboardView,
    AssistantDashboardView,
    HospitalDashboardView,
    HospitalAnalyticsView,
)

__all__ = [
    'AdminDashboardView',
    'DoctorDashboardView',
    'AssistantDashboardView',
    'HospitalDashboardView',
    'HospitalAnalyticsView',
]

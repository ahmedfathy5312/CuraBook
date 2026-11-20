# appointments/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import AppointmentViewSet

app_name = "appointments"

# ==================================================
# Main Router for Appointments
# ==================================================
router = DefaultRouter()
# Register full ViewSet with all default and custom actions
router.register(r'', AppointmentViewSet, basename='appointment')

# ==================================================
# URL Patterns
# ==================================================
urlpatterns = [
    # Includes all routes for AppointmentViewSet
    path('', include(router.urls)),
]

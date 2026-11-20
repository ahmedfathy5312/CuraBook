from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import PatientProfileViewSet

app_name = "patients"
router = DefaultRouter()
router.register(r"", PatientProfileViewSet, basename="patient")

urlpatterns = [path("", include(router.urls))]

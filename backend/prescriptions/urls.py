from django.urls import path
from .views import (
    PrescriptionListCreateView,
    PrescriptionDetailView,
    PrescriptionSendView,
    PrescriptionPDFView,
)

app_name = "prescriptions"

urlpatterns = [
    path("",               PrescriptionListCreateView.as_view(), name="prescription-list"),
    path("<int:pk>/",      PrescriptionDetailView.as_view(),     name="prescription-detail"),
    path("<int:pk>/send/", PrescriptionSendView.as_view(),       name="prescription-send"),
    # API-H07 FIX: PDF export endpoint
    path("<int:pk>/pdf/",  PrescriptionPDFView.as_view(),        name="prescription-pdf"),
]

from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import AssistantProfileViewSet, AssistantUnifiedAppointmentsView, AssistantSearchView

app_name = "assistants"
router = DefaultRouter()
router.register(r"", AssistantProfileViewSet, basename="assistant")

urlpatterns = [
    # Bug #6 Fix: search endpoint for AddAssistantToHospitalModal
    path("search/", AssistantSearchView.as_view(), name="assistant-search"),

    # ViewSet routes (my-workplaces, my-appointments, etc.)
    path("", include(router.urls)),
]

from django.urls import path
from .views import (
    AdminDashboardView,
    DoctorDashboardView,
    AssistantDashboardView,
    HospitalDashboardView,
)

app_name = 'analytics'

urlpatterns = [
    path('admin/',     AdminDashboardView.as_view(),     name='admin-dashboard'),
    path('doctor/',    DoctorDashboardView.as_view(),    name='doctor-dashboard'),
    path('assistant/', AssistantDashboardView.as_view(), name='assistant-dashboard'),
    path('hospital/',  HospitalDashboardView.as_view(),  name='hospital-dashboard'),
]

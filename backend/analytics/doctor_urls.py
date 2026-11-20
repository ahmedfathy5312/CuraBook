"""
analytics/doctor_urls.py
========================
B-05 FIX: URL routing only.
All view logic moved to analytics/views/doctor_views.py.
Single-responsibility: urls.py maps paths, views/ holds implementation.
"""

from django.urls import path

from analytics.views import DoctorDashboardView
from analytics.views.doctor_views import (
    DoctorAppointmentListView,
    DoctorAppointmentDetailView,
    DoctorAppointmentCompleteView,
    DoctorTodayScheduleView,
    DoctorPatientListView,
    DoctorPatientDetailView,
    DoctorAssistantListView,
    DoctorAssistantDetailView,
    DoctorProfileView,
    DoctorScheduleView,
    DoctorWorkingHoursView,
    PatientRecordListView,
    PatientRecordDetailView,
    FlatPatientRecordCreateView,  # BUG 1 FIX
    DoctorNotificationPreferencesView,  # BUG-7 FIX
    DoctorAnalyticsDetailView,  # P1-FEAT-5
    DoctorPrescriptionProxyView,  # BUG #4 FIX
)

app_name = "doctor_api"

urlpatterns = [
    path("profile/",                DoctorProfileView.as_view(),               name="doctor-profile"),
    path("stats/",                  DoctorDashboardView.as_view(),              name="doctor-stats"),
    path("appointments/",           DoctorAppointmentListView.as_view(),        name="doctor-appointments"),
    path("appointments/<int:pk>/",
         DoctorAppointmentDetailView.as_view(),                                 name="doctor-appointment-detail"),
    path("appointments/<int:pk>/complete/",
         DoctorAppointmentCompleteView.as_view(),                               name="doctor-appointment-complete"),
    path("today-schedule/",         DoctorTodayScheduleView.as_view(),          name="doctor-today-schedule"),
    path("patients/",               DoctorPatientListView.as_view(),            name="doctor-patients"),
    path("patients/<int:pk>/",      DoctorPatientDetailView.as_view(),          name="doctor-patient-detail"),
    path("patients/<int:patient_pk>/records/",
         PatientRecordListView.as_view(),                                        name="doctor-patient-records"),
    path("patients/<int:patient_pk>/records/<uuid:record_pk>/",
         PatientRecordDetailView.as_view(),                                      name="doctor-patient-record-detail"),
    path("assistants/",             DoctorAssistantListView.as_view(),          name="doctor-assistants"),
    path("assistants/<int:pk>/",    DoctorAssistantDetailView.as_view(),        name="doctor-assistant-detail"),
    path("schedule/",               DoctorScheduleView.as_view(),               name="doctor-schedule"),
    path("working-hours/",          DoctorWorkingHoursView.as_view(),           name="doctor-working-hours"),
    # ── BUG 1 FIX ────────────────────────────────────────────────────────────
    # Frontend NewPatientRecordPage.jsx POSTs to /api/v1/doctor/patient-records/
    # with {patient_name, phone, ...} as flat payload (no patient_pk in URL).
    # This flat alias resolves the patient by name/phone and creates the record.
    path("patient-records/",        FlatPatientRecordCreateView.as_view(),      name="doctor-patient-records-flat"),
    # ── BUG #4 FIX ───────────────────────────────────────────────────────────
    # DoctorPrescriptionsPage.jsx fetches/posts to /api/v1/doctor/prescriptions/
    # but the real endpoint is /api/v1/prescriptions/ (role-scoped in views).
    # This proxy alias forwards to PrescriptionListCreateView so both URLs work.
    path("prescriptions/",          DoctorPrescriptionProxyView.as_view(),       name="doctor-prescriptions"),
    # ── BUG-7 FIX ────────────────────────────────────────────────────────────
    path("notifications/",          DoctorNotificationPreferencesView.as_view(), name="doctor-notifications"),
    # ── P1-FEAT-5: Real Analytics ─────────────────────────────────────────────
    path("analytics/",              DoctorAnalyticsDetailView.as_view(),         name="doctor-analytics-detail"),
]

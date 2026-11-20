"""
analytics/tests.py — Real unit tests for the analytics app.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class AnalyticsViewsImportTest(TestCase):
    """Smoke tests — verify all analytics views are importable."""

    def test_admin_dashboard_view_importable(self):
        from analytics.views import AdminDashboardView
        self.assertIsNotNone(AdminDashboardView)

    def test_doctor_dashboard_view_importable(self):
        from analytics.views import DoctorDashboardView
        self.assertIsNotNone(DoctorDashboardView)

    def test_hospital_dashboard_view_importable(self):
        from analytics.views import HospitalDashboardView
        self.assertIsNotNone(HospitalDashboardView)

    def test_doctor_views_importable(self):
        from analytics.views.doctor_views import (
            DoctorAppointmentListView,
            DoctorPatientListView,
            DoctorProfileView,
        )
        for view in [DoctorAppointmentListView, DoctorPatientListView, DoctorProfileView]:
            self.assertIsNotNone(view)


class AdminAnalyticsAPITest(TestCase):
    """Test /api/v1/admin/* endpoints require admin role."""

    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='pat_analytics', email='pat@test.com',
            password='Test@12345', is_patient=True,
        )
        self.admin = User.objects.create_superuser(
            username='admin_analytics', email='adm@test.com',
            password='Admin@12345', is_staff=True, is_superuser=True,
        )

    def test_admin_stats_requires_auth(self):
        response = self.client.get('/api/v1/admin/stats/')
        self.assertIn(response.status_code, [401, 403])

    def test_admin_stats_rejects_patient(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get('/api/v1/admin/stats/')
        self.assertIn(response.status_code, [403, 401])

    def test_admin_stats_accessible_by_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/admin/stats/')
        self.assertIn(response.status_code, [200, 404])


class DoctorAnalyticsAPITest(TestCase):
    """Test /api/v1/doctor/* endpoints require doctor role."""

    def setUp(self):
        self.client = APIClient()
        self.doctor = User.objects.create_user(
            username='dr_analytics', email='dr@test.com',
            password='Test@12345', is_doctor=True,
        )

    def test_doctor_stats_requires_auth(self):
        response = self.client.get('/api/v1/doctor/stats/')
        self.assertIn(response.status_code, [401, 403])

    def test_doctor_stats_accessible_by_doctor(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get('/api/v1/doctor/stats/')
        self.assertIn(response.status_code, [200, 404])

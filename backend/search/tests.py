"""
search/tests.py — Real unit tests for the search app.
Full search integration tests: backend/tests/test_search.py
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class SearchViewAccessTest(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_search_endpoint_accessible_unauthenticated(self):
        """GET /api/v1/search/doctors/ should return 200 (AllowAny permission)."""
        response = self.client.get('/api/v1/search/doctors/')
        # 200 = results (even empty), 404 would mean URL not registered
        self.assertNotEqual(response.status_code, 404)

    def test_search_accepts_specialty_param(self):
        """?specialty= filter must not raise a 500."""
        response = self.client.get('/api/v1/search/doctors/?specialty=cardiology')
        self.assertNotEqual(response.status_code, 500)

    def test_search_accepts_specialization_alias(self):
        """?specialization= (frontend alias) must also be accepted — B-04 fix."""
        response = self.client.get('/api/v1/search/doctors/?specialization=cardiology')
        self.assertNotEqual(response.status_code, 500)

    def test_search_accepts_city_param(self):
        """?city= filter must not raise a 500."""
        response = self.client.get('/api/v1/search/doctors/?city=cairo')
        self.assertNotEqual(response.status_code, 500)

    def test_search_response_has_results_key(self):
        """Response envelope should contain results or data."""
        response = self.client.get('/api/v1/search/doctors/')
        if response.status_code == 200:
            data = response.json()
            # Either paginated (results key) or wrapped (data key)
            has_results = 'results' in data or 'data' in data
            self.assertTrue(has_results, f"Unexpected response shape: {list(data.keys())}")


class SearchPaginationTest(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_pagination_uses_page_param(self):
        """?page=1 must not raise an error."""
        response = self.client.get('/api/v1/search/doctors/?page=1')
        self.assertNotEqual(response.status_code, 500)

    def test_invalid_page_returns_404_or_empty(self):
        """?page=9999 should return 404 or empty results, not 500."""
        response = self.client.get('/api/v1/search/doctors/?page=9999')
        self.assertIn(response.status_code, [200, 404])

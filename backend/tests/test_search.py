"""
CuraBook — Tests: Search Service + Redis Cache
"""

import pytest
from unittest.mock import patch, MagicMock
from django.core.cache import cache

from search.services import search_doctors, _cache_key
from tests.factories import DoctorProfileFactory, ClinicFactory


@pytest.mark.django_db
class TestDoctorSearch:

    def setup_method(self):
        cache.clear()

    def test_returns_matching_doctors(self):
        profile = DoctorProfileFactory(specialty='Cardiology')

        results = search_doctors(query='Cardiology')

        assert any(r.id == profile.id for r in results)

    def test_filter_by_specialty(self):
        cardio  = DoctorProfileFactory(specialty='Cardiology')
        neuro   = DoctorProfileFactory(specialty='Neurology')

        results = search_doctors(specialty='Cardiology')
        ids = [r.id for r in results]

        assert cardio.id in ids
        assert neuro.id not in ids

    def test_returns_empty_for_no_match(self):
        results = search_doctors(query='zzz_no_match_xyz')
        assert results == []

    def test_respects_limit(self):
        for _ in range(10):
            DoctorProfileFactory(specialty='GeneralPractice')

        results = search_doctors(specialty='GeneralPractice', limit=3)
        assert len(results) <= 3


@pytest.mark.django_db
class TestSearchCaching:

    def setup_method(self):
        cache.clear()

    def test_result_cached_after_first_call(self):
        DoctorProfileFactory(specialty='CachedSpec')

        with patch('search.services.cache.set') as mock_set:
            search_doctors(specialty='CachedSpec')
            assert mock_set.called

    def test_cache_hit_skips_db(self):
        key = _cache_key('doctors', q='', specialty='CachedSpec',
                         city='', available=False, rating=None)
        cache.set(key, ['cached_result'], timeout=300)

        with patch('users.models.DoctorProfile.objects') as mock_qs:
            results = search_doctors(specialty='CachedSpec')

        # DB should NOT be queried — cache served it
        assert results == ['cached_result']
        mock_qs.filter.assert_not_called()


@pytest.mark.django_db
class TestSearchAPI:

    def test_doctor_search_endpoint(self):
        from rest_framework.test import APIClient
        DoctorProfileFactory(specialty='Dentistry')
        cache.clear()

        client = APIClient()
        resp = client.get('/api/v1/search/doctors/?specialty=Dentistry')

        assert resp.status_code == 200
        assert resp.json()['count'] >= 1

    def test_global_search_requires_q_param(self):
        from rest_framework.test import APIClient
        resp = APIClient().get('/api/v1/search/')
        assert resp.status_code == 200
        assert resp.json()['results'] == []

    def test_slots_endpoint_requires_doctor_id(self):
        from rest_framework.test import APIClient
        resp = APIClient().get('/api/v1/search/slots/')
        assert resp.status_code == 400

    def test_global_search_response_includes_all_entity_types(self):
        """
        API-H04: GET /api/v1/search/?q=test must return a response that
        contains 'doctors', 'clinics', and 'hospitals' keys so the
        frontend can render all result types.
        """
        from rest_framework.test import APIClient
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Authenticated user required for search
        user = User.objects.create_user(
            email='searcher@example.com',
            password='Pass1234!',
            full_name='Searcher',
            is_patient=True,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/search/?q=test')
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        # Support both envelope {"data": {...}} and flat {"doctors": [...]}
        body = data.get('data', data)
        assert 'doctors' in body, \
            f"Global search response must include 'doctors'. Got keys: {list(body.keys())}"
        assert 'clinics' in body, \
            f"Global search response must include 'clinics'. Got keys: {list(body.keys())}"
        assert 'hospitals' in body, \
            f"Global search response must include 'hospitals'. Got keys: {list(body.keys())}"

"""
CuraBook — Rate Limiting Tests

Verifies that scoped throttles are enforced correctly.
"""

import pytest
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework import status


# Override throttle rates to tiny numbers for testing
FAST_THROTTLE = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '1000/hour',
        'login':    '3/minute',
        'register': '2/hour',
        'booking':  '2/minute',
        'search':   '5/minute',
    },
}


@pytest.mark.django_db
class TestLoginThrottle:

    @override_settings(REST_FRAMEWORK=FAST_THROTTLE)
    def test_login_throttled_after_limit(self):
        """After 3 login attempts, 4th should get 429."""
        client = APIClient()
        payload = {'username': 'nonexistent', 'password': 'wrong'}

        responses = []
        for _ in range(4):
            resp = client.post('/api/v1/auth/login/', payload)
            responses.append(resp.status_code)

        # First 3: 401 (wrong credentials), 4th: 429 (throttled)
        assert status.HTTP_429_TOO_MANY_REQUESTS in responses, \
            f"Expected 429 in responses: {responses}"

    def test_successful_login_not_throttled_normally(self):
        """Normal login should not be throttled."""
        from tests.factories import PatientUserFactory
        user   = PatientUserFactory()
        client = APIClient()

        resp = client.post('/api/v1/auth/login/', {
            'username': user.username,
            'password': 'Test1234!',
        })
        assert resp.status_code in (200, 201)


@pytest.mark.django_db
class TestSearchThrottle:

    @override_settings(REST_FRAMEWORK=FAST_THROTTLE)
    def test_search_throttled_after_limit(self):
        """After 5 search requests, 6th should get 429."""
        client = APIClient()

        responses = []
        for i in range(6):
            resp = client.get(f'/api/v1/search/doctors/?specialty=cardio{i}')
            responses.append(resp.status_code)

        assert status.HTTP_429_TOO_MANY_REQUESTS in responses, \
            f"Expected 429 in responses: {responses}"


@pytest.mark.django_db
class TestBookingThrottle:

    @override_settings(REST_FRAMEWORK=FAST_THROTTLE)
    def test_booking_throttled_after_limit(self):
        """After 2 booking attempts, 3rd should get 429."""
        from rest_framework_simplejwt.tokens import RefreshToken
        from tests.factories import PatientUserFactory

        patient = PatientUserFactory()
        client  = APIClient()
        token   = str(RefreshToken.for_user(patient).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        responses = []
        for _ in range(3):
            resp = client.post('/api/v1/appointments/', {
                'doctor': 999,
                'slot': 999,
                'visit_type': 'IN_PERSON',
            })
            responses.append(resp.status_code)

        # Should eventually get 429 (even if first ones are 400/404)
        assert status.HTTP_429_TOO_MANY_REQUESTS in responses, \
            f"Expected 429 in responses: {responses}"

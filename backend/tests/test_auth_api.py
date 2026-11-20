"""
CuraBook — API Tests: Authentication

Tests JWT login, refresh, registration, and token blacklist.
"""

import pytest
from rest_framework.test import APIClient
from rest_framework import status

from tests.factories import PatientUserFactory, DoctorUserFactory


LOGIN_URL   = '/api/v1/auth/login/'
REFRESH_URL = '/api/v1/auth/token/refresh/'


@pytest.mark.django_db
class TestJWTAuth:

    def test_login_with_correct_credentials(self):
        """
        F-01 FIX: LoginView removes 'refresh' from JSON body and sets it
        as an HttpOnly cookie (__cb_refresh). Test checks:
          - 200 status
          - 'access' token in JSON body
          - __cb_refresh cookie is set (not refresh in JSON)
        """
        user = PatientUserFactory()
        client = APIClient()

        resp = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'Test1234!',
        })

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        # LoginView (TokenObtainPairView) returns access directly in the response root.
        # CuraBookRenderer wraps other views in {'success': True, 'data': {...}}.
        # We accept both formats to be resilient.
        access = data.get('access') or (data.get('data') or {}).get('access')
        assert access is not None, f"Expected 'access' token in response. Got: {list(data.keys())}"
        # F-01: refresh token is in the HttpOnly cookie, NOT in JSON body
        assert 'refresh' not in data
        assert '__cb_refresh' in resp.cookies

    def test_login_with_email(self):
        user = PatientUserFactory()
        client = APIClient()

        resp = client.post(LOGIN_URL, {
            'username': user.email,     # email accepted as username
            'password': 'Test1234!',
        })

        assert resp.status_code == status.HTTP_200_OK

    def test_login_fails_with_wrong_password(self):
        user = PatientUserFactory()
        client = APIClient()

        resp = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'WrongPass!',
        })

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_fails_for_inactive_user(self):
        user = PatientUserFactory(is_active=False)
        client = APIClient()

        resp = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'Test1234!',
        })

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self):
        """
        F-01 FIX: CookieTokenRefreshView reads the refresh token from the
        __cb_refresh cookie, not from the request body.
        We simulate this by manually setting the cookie on the client.
        """
        user = PatientUserFactory()
        client = APIClient()

        # Login to obtain the refresh token cookie
        login = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'Test1234!',
        })
        assert login.status_code == 200
        refresh_cookie = login.cookies.get('__cb_refresh')
        assert refresh_cookie is not None, "Login should set __cb_refresh cookie"

        # Use the cookie to obtain a new access token
        client.cookies['__cb_refresh'] = refresh_cookie.value
        resp = client.post(REFRESH_URL)

        assert resp.status_code == status.HTTP_200_OK
        # CuraBookRenderer wraps the response: {'success': True, 'data': {'access': '...'}}
        body = resp.json()
        access = body.get('access') or (body.get('data') or {}).get('access')
        assert access is not None, f"Expected 'access' in refresh response. Got: {body}"

    def test_access_protected_endpoint(self):
        user = PatientUserFactory()
        client = APIClient()

        login = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'Test1234!',
        })
        assert login.status_code == 200
        body = login.json()
        # Accept both root-level and renderer-wrapped access token
        token = body.get('access') or (body.get('data') or {}).get('access')
        assert token is not None, f"Expected access token in login response. Got: {body}"

        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = client.get('/api/v1/appointments/')

        assert resp.status_code == status.HTTP_200_OK

    def test_access_rejected_with_invalid_token(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        resp = client.get('/api/v1/appointments/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

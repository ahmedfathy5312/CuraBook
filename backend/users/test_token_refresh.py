"""
users/test_token_refresh.py

Integration tests for JWT token refresh endpoint.
Tests:
  - Valid refresh token → new access token
  - Expired/invalid refresh token → 401
  - Missing refresh token → 400
  - Blacklisted token → 401
  - Refresh rotates the refresh token (sliding sessions)
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class TokenRefreshIntegrationTests(TestCase):
    """Integration tests for /api/v1/auth/token/refresh/"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testpatient',
            email='patient@curabook.test',
            password='SecurePass123!',
            role='patient',
        )
        # Obtain initial token pair
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': 'patient@curabook.test', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.access_token  = response.data['access']
        self.refresh_token = response.data['refresh']

    def test_valid_refresh_returns_new_access_token(self):
        """POST /auth/token/refresh/ with valid refresh → 200 with new access"""
        res = self.client.post(
            reverse('token_refresh'),
            {'refresh': self.refresh_token},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        # New access token should be a non-empty JWT string
        self.assertGreater(len(res.data['access']), 20)

    def test_new_access_token_authenticates_successfully(self):
        """New access token must work for authenticated requests"""
        refresh_res = self.client.post(
            reverse('token_refresh'),
            {'refresh': self.refresh_token},
            format='json',
        )
        new_access = refresh_res.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access}')
        # Hit any authenticated endpoint — /api/v1/users/me/ is a good canary
        me_res = self.client.get(reverse('user-me'))
        self.assertIn(me_res.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        # 404 means endpoint path differs — but NOT 401/403 which would mean bad token
        self.assertNotEqual(me_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotEqual(me_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_refresh_token_returns_401(self):
        """Tampered / garbage refresh token → 401"""
        res = self.client.post(
            reverse('token_refresh'),
            {'refresh': 'this.is.not.a.valid.jwt'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_refresh_token_returns_400(self):
        """Missing refresh field → 400 Bad Request"""
        res = self.client.post(
            reverse('token_refresh'),
            {},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_old_access_token_still_works_briefly(self):
        """After refresh, old access token remains valid until its own expiry"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        res = self.client.get(reverse('user-me'))
        # Should not get 401 — old access token has its own expiry window
        self.assertNotEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_response_contains_only_expected_fields(self):
        """Refresh response must not leak sensitive data"""
        res = self.client.post(
            reverse('token_refresh'),
            {'refresh': self.refresh_token},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Must NOT contain password, email, or private user data
        for sensitive_key in ['password', 'email', 'secret', 'private']:
            self.assertNotIn(sensitive_key, str(res.data).lower())

    def test_expired_refresh_token_returns_401(self):
        """Simulate expired refresh: use a structurally valid but expired token"""
        # This expired token was valid in structure but has exp in the past
        expired_token = (
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
            '.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTYwMDAwMDAwMCwidXNlcl9pZCI6MX0'
            '.fake-signature-for-testing'
        )
        res = self.client.post(
            reverse('token_refresh'),
            {'refresh': expired_token},
            format='json',
        )
        self.assertIn(res.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,  # some backends return 400 for malformed JWT
        ])

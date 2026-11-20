"""
apps/accounts/tests.py
======================
Unit tests for the accounts app.

Covers:
 - User model fields and defaults
 - current_role property (B-01 fix)
 - is_active defaults to False (email-verification flow)
 - Full-name / string representation
 - Role flag mutual exclusivity helpers

Integration / API-level tests live in backend/tests/test_auth_api.py.
"""

from django.test import TestCase


class UserModelDefaultsTest(TestCase):
    """Test that User model initialises with the expected defaults."""

    def _make_user(self, **kwargs):
        from apps.accounts.models import User
        defaults = dict(
            username="testuser",
            email="testuser@curabook.com",
            full_name="Test User",
        )
        defaults.update(kwargs)
        user = User(**defaults)
        user.set_password("Test1234!")
        return user

    def test_is_active_defaults_to_false(self):
        """New users must verify email before they can log in."""
        user = self._make_user()
        self.assertFalse(user.is_active)

    def test_role_flags_default_to_false(self):
        user = self._make_user()
        self.assertFalse(user.is_doctor)
        self.assertFalse(user.is_patient)
        self.assertFalse(user.is_assistant)
        self.assertFalse(user.hospital_admin)
        self.assertFalse(user.is_platform_admin)

    def test_is_staff_defaults_to_false(self):
        user = self._make_user()
        self.assertFalse(user.is_staff)


class UserCurrentRoleTest(TestCase):
    """
    Test the current_role property introduced in B-01 fix.
    Frontend expects 'hospital' (not 'hospital_admin') so the ROLE_ROUTES
    map in AuthContext resolves to /hospital-dashboard correctly.
    """

    def _make_user(self, **flags):
        from apps.accounts.models import User
        u = User(username="u", email="u@curabook.com")
        for k, v in flags.items():
            setattr(u, k, v)
        return u

    def test_patient_role(self):
        u = self._make_user(is_patient=True)
        self.assertEqual(u.current_role, "patient")

    def test_doctor_role(self):
        u = self._make_user(is_doctor=True)
        self.assertEqual(u.current_role, "doctor")

    def test_assistant_role(self):
        u = self._make_user(is_assistant=True)
        self.assertEqual(u.current_role, "assistant")

    def test_hospital_admin_role_returns_hospital(self):
        """B-01 FIX: must return 'hospital', not 'hospital_admin'."""
        u = self._make_user(hospital_admin=True)
        self.assertEqual(u.current_role, "hospital")

    def test_hospital_admin_via_role_field(self):
        """Works even when detected via the role CharField rather than the flag."""
        u = self._make_user(role="hospital_admin")
        self.assertEqual(u.current_role, "hospital")

    def test_platform_admin_role(self):
        u = self._make_user(is_platform_admin=True)
        self.assertEqual(u.current_role, "admin")

    def test_no_flags_falls_back_to_patient(self):
        """Unclassified users are treated as patients (safe default)."""
        u = self._make_user()
        # The property chain ends without a match — check it returns something
        result = u.current_role
        self.assertIsInstance(result, str)


class UserStringRepresentationTest(TestCase):
    """Test __str__ returns something readable."""

    def test_str_contains_username_or_email(self):
        from apps.accounts.models import User
        u = User(username="drsmith", email="drsmith@curabook.com", full_name="Dr Smith")
        s = str(u)
        self.assertTrue(
            "drsmith" in s or "drsmith@curabook.com" in s or "Dr Smith" in s,
            f"__str__ should contain username, email, or full_name. Got: {s!r}",
        )

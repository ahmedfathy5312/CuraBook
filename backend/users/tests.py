"""
users/tests.py — Real unit tests for the users legacy compat layer.
The main user model is in apps/accounts. This tests the compat shims.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelImportTest(TestCase):

    def test_user_model_is_custom(self):
        """get_user_model() must return our custom User, not auth.User."""
        from django.conf import settings
        self.assertEqual(settings.AUTH_USER_MODEL, 'accounts.User')

    def test_user_model_importable_from_apps_accounts(self):
        from apps.accounts.models import User as AccountsUser
        self.assertIsNotNone(AccountsUser)

    def test_custom_user_has_role_flags(self):
        """Custom User must have boolean role flags."""
        for flag in ['is_doctor', 'is_patient', 'is_assistant', 'hospital_admin']:
            self.assertTrue(
                hasattr(User, flag),
                f"User model missing role flag: {flag}"
            )

    def test_custom_user_has_current_role_property(self):
        """current_role property must exist and normalise hospital_admin → hospital."""
        u = User.__new__(User)
        u.hospital_admin = True
        u.role = 'hospital_admin'
        u.is_doctor = False
        u.is_patient = False
        u.is_assistant = False
        u.is_superuser = False
        u.is_platform_admin = False
        self.assertEqual(u.current_role, 'hospital')

    def test_patient_current_role(self):
        u = User.__new__(User)
        u.hospital_admin = False
        u.role = 'patient'
        u.is_doctor = False
        u.is_patient = True
        u.is_assistant = False
        u.is_superuser = False
        u.is_platform_admin = False
        self.assertEqual(u.current_role, 'patient')

    def test_doctor_current_role(self):
        u = User.__new__(User)
        u.hospital_admin = False
        u.role = 'doctor'
        u.is_doctor = True
        u.is_patient = False
        u.is_assistant = False
        u.is_superuser = False
        u.is_platform_admin = False
        self.assertEqual(u.current_role, 'doctor')


class UserManagerTest(TestCase):

    def test_create_user_sets_is_active(self):
        u = User.objects.create_user(
            username='test_user_mgr', email='mgr@test.com', password='Test@12345'
        )
        self.assertTrue(u.is_active)

    def test_create_superuser_sets_is_staff(self):
        u = User.objects.create_superuser(
            username='test_super_mgr', email='super@test.com', password='Admin@12345'
        )
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_superuser)

    def tearDown(self):
        User.objects.filter(username__in=['test_user_mgr', 'test_super_mgr']).delete()

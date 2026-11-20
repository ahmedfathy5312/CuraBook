"""
apps/doctors/tests.py
=====================
Unit tests for the doctors app.

Covers:
 - DoctorProfile field defaults
 - Auto-slug generation from doctor name
 - Slug uniqueness collision handling
 - profile_completed and accepts_booking flags
 - soft-delete flag inherited from SoftDeleteModel

Integration / search / availability tests live in:
 - backend/tests/test_appointment_api.py
 - backend/tests/test_search.py
"""

from django.test import TestCase


class DoctorProfileDefaultsTest(TestCase):
    """DoctorProfile initialises with safe defaults."""

    def _make_profile(self, **kwargs):
        from apps.doctors.models import DoctorProfile
        profile = DoctorProfile(**kwargs)
        return profile

    def test_accepts_booking_defaults_to_true(self):
        profile = self._make_profile()
        self.assertTrue(profile.accepts_booking)

    def test_profile_completed_defaults_to_false(self):
        """Profile is incomplete until the doctor fills in all required fields."""
        profile = self._make_profile()
        self.assertFalse(profile.profile_completed)

    def test_education_defaults_to_empty_list(self):
        profile = self._make_profile()
        self.assertEqual(profile.education, [])

    def test_is_deleted_defaults_to_false(self):
        """Inherits soft-delete flag from SoftDeleteModel."""
        profile = self._make_profile()
        self.assertFalse(profile.is_deleted)


class DoctorProfileSlugTest(TestCase):
    """Slug is auto-generated from the linked user's full_name."""

    def test_slug_generated_on_save(self):
        """
        Saving a DoctorProfile without a pre-set slug should auto-populate
        it from the user's full_name.
        """
        from tests.factories import DoctorProfileFactory

        profile = DoctorProfileFactory(slug=None)
        # slug should now be non-empty
        profile.refresh_from_db()
        self.assertIsNotNone(profile.slug)
        self.assertGreater(len(profile.slug), 0)

    def test_slug_is_unique_across_profiles(self):
        """Collisions are resolved by appending a counter (e.g. dr-ahmed-2)."""
        from tests.factories import DoctorProfileFactory
        from apps.accounts.models import User

        # Create two doctors with the same full_name
        user1 = User.objects.create_user(
            username="doc_a", email="doc_a@curabook.com",
            full_name="Dr Ahmed", is_doctor=True, is_active=True,
        )
        user2 = User.objects.create_user(
            username="doc_b", email="doc_b@curabook.com",
            full_name="Dr Ahmed", is_doctor=True, is_active=True,
        )

        from apps.doctors.models import DoctorProfile
        p1 = DoctorProfile.objects.create(user=user1, specialty="Cardiology")
        p2 = DoctorProfile.objects.create(user=user2, specialty="Cardiology")

        self.assertNotEqual(p1.slug, p2.slug)

    def test_preset_slug_is_not_overwritten(self):
        """If a slug is set before save, it should be preserved."""
        from apps.accounts.models import User
        from apps.doctors.models import DoctorProfile

        user = User.objects.create_user(
            username="doc_preset", email="preset@curabook.com",
            full_name="Dr Preset", is_doctor=True, is_active=True,
        )
        profile = DoctorProfile.objects.create(user=user, slug="my-custom-slug")
        self.assertEqual(profile.slug, "my-custom-slug")


class DoctorProfileSoftDeleteTest(TestCase):
    """Soft-deleted profiles are excluded from normal querysets."""

    def test_soft_delete_sets_flag(self):
        from tests.factories import DoctorProfileFactory
        profile = DoctorProfileFactory()
        profile.delete()
        profile.refresh_from_db()
        self.assertTrue(profile.is_deleted)

    def test_soft_deleted_profile_excluded_from_default_queryset(self):
        from tests.factories import DoctorProfileFactory
        from apps.doctors.models import DoctorProfile

        profile = DoctorProfileFactory()
        pk = profile.pk
        profile.delete()

        qs = DoctorProfile.objects.filter(pk=pk)
        self.assertEqual(qs.count(), 0, "Soft-deleted profile must not appear in default queryset")

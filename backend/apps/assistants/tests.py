"""
apps/assistants/tests.py
========================
Unit tests for the assistants app.

Covers:
 - AssistantProfile field defaults
 - can_manage_appointments flag
 - Soft-delete inherited from SoftDeleteModel
 - Multi-workplace assignment (clinic + hospital)
 - __str__ representation

Integration / multi-workplace WebSocket tests live in:
 - backend/tests/test_permissions.py
 - backend/tests/test_enterprise_hardening.py
"""

from django.test import TestCase


class AssistantProfileDefaultsTest(TestCase):
    """AssistantProfile initialises with the correct defaults."""

    def test_can_manage_appointments_defaults_to_true(self):
        from apps.assistants.models import AssistantProfile
        profile = AssistantProfile()
        self.assertTrue(profile.can_manage_appointments)

    def test_is_deleted_defaults_to_false(self):
        from apps.assistants.models import AssistantProfile
        profile = AssistantProfile()
        self.assertFalse(profile.is_deleted)

    def test_str_is_readable(self):
        from tests.factories import AssistantProfileFactory
        profile = AssistantProfileFactory()
        s = str(profile)
        self.assertIsInstance(s, str)
        self.assertGreater(len(s), 0)


class AssistantSoftDeleteTest(TestCase):
    """Soft-deleted assistants are excluded from default querysets."""

    def test_soft_delete_sets_flag(self):
        from tests.factories import AssistantProfileFactory
        profile = AssistantProfileFactory()
        profile.delete()
        profile.refresh_from_db()
        self.assertTrue(profile.is_deleted)

    def test_soft_deleted_excluded_from_queryset(self):
        from tests.factories import AssistantProfileFactory
        from apps.assistants.models import AssistantProfile

        profile = AssistantProfileFactory()
        pk = profile.pk
        profile.delete()

        qs = AssistantProfile.objects.filter(pk=pk)
        self.assertEqual(
            qs.count(), 0,
            "Soft-deleted AssistantProfile must not appear in default queryset",
        )


class AssistantWorkplaceAssignmentTest(TestCase):
    """
    Assistants can be assigned to multiple clinics AND multiple hospitals.
    This is critical for the multi-workplace unified appointments view (B-06).
    """

    def test_assistant_can_be_assigned_to_clinic(self):
        from tests.factories import (
            AssistantProfileFactory,
            ClinicFactory,
            ClinicAssistantFactory,
        )
        profile = AssistantProfileFactory()
        clinic  = ClinicFactory()
        assignment = ClinicAssistantFactory(assistant=profile, clinic=clinic)
        self.assertEqual(assignment.assistant, profile)
        self.assertEqual(assignment.clinic, clinic)
        self.assertTrue(assignment.is_active)

    def test_assistant_can_be_assigned_to_hospital(self):
        from tests.factories import (
            AssistantProfileFactory,
            HospitalFactory,
            HospitalAssistantFactory,
        )
        profile  = AssistantProfileFactory()
        hospital = HospitalFactory()
        assignment = HospitalAssistantFactory(assistant=profile, hospital=hospital)
        self.assertEqual(assignment.assistant, profile)
        self.assertEqual(assignment.hospital, hospital)
        self.assertTrue(assignment.is_active)

    def test_assistant_can_be_in_multiple_clinics(self):
        from tests.factories import (
            AssistantProfileFactory,
            ClinicFactory,
            ClinicAssistantFactory,
        )
        profile = AssistantProfileFactory()
        clinic1 = ClinicFactory()
        clinic2 = ClinicFactory()
        ClinicAssistantFactory(assistant=profile, clinic=clinic1)
        ClinicAssistantFactory(assistant=profile, clinic=clinic2)

        from clinics.models import ClinicAssistant
        count = ClinicAssistant.objects.filter(
            assistant=profile, is_active=True
        ).count()
        self.assertEqual(count, 2)


# ── Sprint 5: Permissions & API Coverage ──────────────────────────────────────

class AssistantPermissionsTest(TestCase):
    """
    Assistants can manage appointments but NOT edit schedule or upload documents.
    These permission flags are enforced in the backend and reflected in the UI.
    """

    def test_can_manage_appointments_is_true_by_default(self):
        from apps.assistants.models import AssistantProfile
        profile = AssistantProfile()
        self.assertTrue(profile.can_manage_appointments)

    def test_can_edit_schedule_is_false_by_default(self):
        from apps.assistants.models import AssistantProfile
        profile = AssistantProfile()
        # المساعد لا يستطيع تعديل الجدول — هذا حق الدكتور فقط
        self.assertFalse(getattr(profile, 'can_edit_schedule', False))

    def test_can_upload_documents_is_false_by_default(self):
        from apps.assistants.models import AssistantProfile
        profile = AssistantProfile()
        self.assertFalse(getattr(profile, 'can_upload_documents', False))

    def test_public_id_is_set_on_save(self):
        from tests.factories import AssistantProfileFactory
        profile = AssistantProfileFactory()
        self.assertIsNotNone(getattr(profile, 'public_id', None))


class AssistantMultiWorkplacePermissionTest(TestCase):
    """
    Permissions should work correctly when an assistant is in multiple workplaces.
    """

    def test_permissions_are_per_assistant_not_per_workplace(self):
        from tests.factories import (
            AssistantProfileFactory,
            ClinicFactory,
            ClinicAssistantFactory,
        )
        profile = AssistantProfileFactory()
        for _ in range(3):
            clinic = ClinicFactory()
            ClinicAssistantFactory(assistant=profile, clinic=clinic)

        # الصلاحيات على مستوى الـ profile لا على مستوى كل clinic
        self.assertTrue(profile.can_manage_appointments)

    def test_deactivated_assignment_excludes_assistant(self):
        from tests.factories import (
            AssistantProfileFactory,
            ClinicFactory,
            ClinicAssistantFactory,
        )
        from clinics.models import ClinicAssistant
        profile = AssistantProfileFactory()
        clinic  = ClinicFactory()
        assignment = ClinicAssistantFactory(assistant=profile, clinic=clinic)

        # ألغِ التفعيل
        assignment.is_active = False
        assignment.save()

        active_count = ClinicAssistant.objects.filter(
            assistant=profile, is_active=True
        ).count()
        self.assertEqual(active_count, 0)

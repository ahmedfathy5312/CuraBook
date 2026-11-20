"""
apps/patients/tests.py
======================
Unit tests for the patients app.

Covers:
 - PatientProfile creation and field defaults
 - PatientRecord BloodType choices
 - PatientRecord default blood_type is UNKNOWN
 - allergies / chronic_diseases default to blank
 - PatientRecord __str__ representation

Integration tests (medical-history endpoint, role scoping) live in:
 - backend/tests/test_appointment_api.py
 - backend/tests/test_permissions.py
"""

from django.test import TestCase


class PatientProfileTest(TestCase):
    """PatientProfile field defaults and constraints."""

    def test_profile_creation(self):
        from tests.factories import PatientUserFactory, PatientProfileFactory
        user = PatientUserFactory()
        profile = PatientProfileFactory(user=user)
        self.assertEqual(profile.user, user)

    def test_gender_defaults_to_blank(self):
        from apps.patients.models import PatientProfile
        from tests.factories import PatientUserFactory
        user = PatientUserFactory()
        profile = PatientProfile(user=user)
        # blank is the default — no validation error expected
        self.assertEqual(profile.gender, "")


class PatientRecordBloodTypeTest(TestCase):
    """PatientRecord BloodType choices and default value."""

    def test_blood_type_default_is_unknown(self):
        from apps.patients.models import PatientRecord
        record = PatientRecord()
        self.assertEqual(record.blood_type, PatientRecord.BloodType.UNKNOWN)

    def test_blood_type_choices_include_common_types(self):
        from apps.patients.models import PatientRecord
        valid_choices = {c[0] for c in PatientRecord.BloodType.choices}
        for expected in ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]:
            self.assertIn(
                expected, valid_choices,
                f"BloodType choices should include '{expected}'",
            )

    def test_allergies_defaults_to_blank(self):
        from apps.patients.models import PatientRecord
        record = PatientRecord()
        self.assertEqual(record.allergies, "")

    def test_chronic_diseases_defaults_to_blank(self):
        from apps.patients.models import PatientRecord
        record = PatientRecord()
        self.assertEqual(record.chronic_diseases, "")


class PatientRecordStrTest(TestCase):
    """__str__ is human-readable."""

    def test_str_is_string(self):
        from apps.patients.models import PatientRecord
        from tests.factories import PatientUserFactory
        user = PatientUserFactory()
        record = PatientRecord(patient=user)
        s = str(record)
        self.assertIsInstance(s, str)
        self.assertGreater(len(s), 0)

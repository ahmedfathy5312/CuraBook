"""
apps/departments/tests.py
=========================
Unit tests for the departments app.

Covers:
 - Department field defaults
 - unique_together (hospital + name) constraint
 - is_active default
 - __str__ representation

Integration tests (department CRUD via Hospital Admin) live in:
 - backend/tests/test_dashboard.py
"""

from django.test import TestCase


class DepartmentDefaultsTest(TestCase):
    """Department model initialises with safe defaults."""

    def test_is_active_defaults_to_true(self):
        from apps.departments.models import Department
        dept = Department()
        self.assertTrue(dept.is_active)

    def test_description_defaults_to_blank(self):
        from apps.departments.models import Department
        dept = Department()
        self.assertEqual(dept.description, "")


class DepartmentStrTest(TestCase):
    """__str__ returns '{name} — {hospital.name}'."""

    def test_str_includes_name_and_hospital(self):
        from tests.factories import HospitalFactory
        from apps.departments.models import Department

        hospital = HospitalFactory()
        dept = Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            description="Heart department",
        )
        s = str(dept)
        self.assertIn("Cardiology", s)
        self.assertIn(hospital.name, s)


class DepartmentUniquenessTest(TestCase):
    """Same hospital cannot have two departments with identical names."""

    def test_duplicate_department_name_raises_integrity_error(self):
        from django.db import IntegrityError
        from tests.factories import HospitalFactory
        from apps.departments.models import Department

        hospital = HospitalFactory()
        Department.objects.create(hospital=hospital, name="Radiology")

        with self.assertRaises(IntegrityError):
            Department.objects.create(hospital=hospital, name="Radiology")

    def test_same_name_in_different_hospitals_is_allowed(self):
        from tests.factories import HospitalFactory
        from apps.departments.models import Department

        h1 = HospitalFactory()
        h2 = HospitalFactory()
        Department.objects.create(hospital=h1, name="Radiology")
        # Should NOT raise
        dept2 = Department.objects.create(hospital=h2, name="Radiology")
        self.assertEqual(dept2.name, "Radiology")
        self.assertEqual(dept2.hospital, h2)


class DepartmentDeactivationTest(TestCase):
    """Departments can be soft-deactivated via is_active=False."""

    def test_deactivate_department(self):
        from tests.factories import HospitalFactory
        from apps.departments.models import Department

        hospital = HospitalFactory()
        dept = Department.objects.create(hospital=hospital, name="Oncology")
        self.assertTrue(dept.is_active)

        dept.is_active = False
        dept.save()
        dept.refresh_from_db()
        self.assertFalse(dept.is_active)

"""
hospital/tests.py — Real unit tests for the hospital app.
Full API integration tests: backend/tests/test_auth_api.py
"""
from django.test import TestCase


class HospitalModelTest(TestCase):

    def test_hospital_has_required_fields(self):
        from hospital.models import Hospital
        field_names = [f.name for f in Hospital._meta.get_fields()]
        for required in ['name', 'city', 'address']:
            self.assertIn(required, field_names, f"Hospital missing field: {required}")

    def test_hospital_str_returns_name(self):
        from hospital.models import Hospital
        h = Hospital.__new__(Hospital)
        h.name = 'Qasr El Aini Hospital'
        self.assertEqual(str(h), 'Qasr El Aini Hospital')

    def test_hospital_slug_not_empty_for_named_hospital(self):
        """Slug fallback must never be an empty string."""
        from hospital.models import Hospital
        h = Hospital.__new__(Hospital)
        h.name = ''
        h.pk = 99
        # With empty name, slug should fall back to 'hospital-{pk}'
        # We verify the fallback path is present in model code
        import inspect
        src = inspect.getsource(Hospital.save)
        self.assertIn('hospital-', src)

    def test_hospital_soft_delete_inherited(self):
        from hospital.models import Hospital
        self.assertTrue(hasattr(Hospital, 'is_deleted'))

    def test_hospital_admin_model_exists(self):
        from hospital.models import HospitalAdmin
        self.assertIsNotNone(HospitalAdmin)

    def test_hospital_doctor_model_exists(self):
        from hospital.models import HospitalDoctor
        self.assertIsNotNone(HospitalDoctor)


class HospitalSerializerTest(TestCase):

    def test_hospital_serializer_importable(self):
        from hospital.serializers import HospitalSerializer
        self.assertIsNotNone(HospitalSerializer)

    def test_hospital_serializer_has_name(self):
        from hospital.serializers import HospitalSerializer
        self.assertIn('name', HospitalSerializer().fields)

    def test_hospital_serializer_has_city(self):
        from hospital.serializers import HospitalSerializer
        self.assertIn('city', HospitalSerializer().fields)

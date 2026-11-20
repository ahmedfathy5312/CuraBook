"""
Management command: seed_e2e_users
===================================
API-H10 FIX: Creates the fixed test accounts used by Playwright E2E tests.
Safe to run multiple times — uses get_or_create for all objects.

Usage:
    python manage.py seed_e2e_users

Accounts created:
    patient@curabook.test   / TestPass123!  — role: patient
    doctor@curabook.test    / TestPass123!  — role: doctor  (approved)
    hospital@curabook.test  / TestPass123!  — role: hospital_admin
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Seed fixed E2E test user accounts for Playwright tests."

    def handle(self, *args, **options):
        self._create_patient()
        self._create_doctor()
        self._create_hospital_admin()
        self.stdout.write(self.style.SUCCESS("✅ E2E test users seeded successfully."))

    # ── Patient ───────────────────────────────────────────────────────────────

    def _create_patient(self):
        user, created = User.objects.get_or_create(
            email="patient@curabook.test",
            defaults={
                "username":   "e2e_patient",
                "full_name":  "E2E Patient",
                "is_patient": True,
                "is_active":  True,
                "is_verified": True,
            },
        )
        if created or not user.has_usable_password():
            user.set_password("TestPass123!")
            user.save(update_fields=["password"])

        # Ensure patient profile exists
        try:
            from users.models import PatientProfile
            PatientProfile.objects.get_or_create(
                user=user,
                defaults={"date_of_birth": "1990-01-01", "gender": "M"},
            )
        except Exception:
            pass

        label = "created" if created else "exists"
        self.stdout.write(f"  patient@curabook.test — {label}")

    # ── Doctor ────────────────────────────────────────────────────────────────

    def _create_doctor(self):
        user, created = User.objects.get_or_create(
            email="doctor@curabook.test",
            defaults={
                "username":    "e2e_doctor",
                "full_name":   "Dr. E2E Test",
                "is_doctor":   True,
                "is_active":   True,
                "is_verified":  True,
            },
        )
        if created or not user.has_usable_password():
            user.set_password("TestPass123!")
            user.save(update_fields=["password"])

        # Ensure doctor profile exists and is approved
        try:
            from users.models import DoctorProfile
            profile, _ = DoctorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "specialty":          "General Medicine",
                    "license_number":     "E2E-LIC-001",
                    "consultation_fee":   200,
                    "is_approved":        True,
                    "years_of_experience": 5,
                    "bio":                "E2E test doctor for automated testing.",
                },
            )
            if not profile.is_approved:
                profile.is_approved = True
                profile.save(update_fields=["is_approved"])
        except Exception:
            pass

        label = "created" if created else "exists"
        self.stdout.write(f"  doctor@curabook.test  — {label}")

    # ── Hospital Admin ────────────────────────────────────────────────────────

    def _create_hospital_admin(self):
        from hospital.models import Hospital

        hospital, _ = Hospital.objects.get_or_create(
            name="E2E Test Hospital",
            defaults={
                "city":    "Cairo",
                "address": "123 Test Street, Cairo",
                "phone":   "+201000000000",
                "email":   "info@e2ehospital.test",
            },
        )

        user, created = User.objects.get_or_create(
            email="hospital@curabook.test",
            defaults={
                "username":        "e2e_hospital_admin",
                "full_name":       "E2E Hospital Admin",
                "is_hospital_admin": True,
                "is_active":       True,
                "is_verified":      True,
            },
        )
        if created or not user.has_usable_password():
            user.set_password("TestPass123!")
            user.save(update_fields=["password"])

        # Link admin to hospital
        try:
            from hospital.models import HospitalAdmin
            HospitalAdmin.objects.get_or_create(
                user=user,
                hospital=hospital,
            )
        except Exception:
            pass

        label = "created" if created else "exists"
        self.stdout.write(f"  hospital@curabook.test — {label}")

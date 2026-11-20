"""
CuraBook — Doctors Services
=============================
Doctor-specific business logic.
"""

from django.core.exceptions import ValidationError
from .models import DoctorProfile


def update_doctor_profile(doctor_profile: DoctorProfile, data: dict) -> DoctorProfile:
    """Update a doctor's profile fields."""
    allowed = {
        "specialty", "bio", "consultation_fee",
        "accepts_booking", "gender", "age", "slot_duration",
    }
    for key, value in data.items():
        if key in allowed:
            setattr(doctor_profile, key, value)

    doctor_profile.full_clean()
    doctor_profile.save()
    return doctor_profile


def toggle_accepting_bookings(doctor_profile: DoctorProfile) -> DoctorProfile:
    """Toggle whether the doctor accepts new bookings."""
    doctor_profile.accepts_booking = not doctor_profile.accepts_booking
    doctor_profile.save(update_fields=["accepts_booking"])
    return doctor_profile

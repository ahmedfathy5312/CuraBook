"""
users/selectors.py — Legacy Compatibility Layer
================================================
The user domain has been split into:
  - apps.accounts  → User model
  - apps.doctors   → DoctorProfile
  - apps.patients  → PatientProfile
  - apps.assistants → AssistantProfile

This file re-exports from the new domain apps for backward compatibility.
New code should import directly from the domain apps.
"""

# Re-export from new domain apps
from apps.accounts.selectors import (
    get_active_user_by_id,
    get_active_user_by_email,
    get_active_user_by_username,
)
from apps.doctors.selectors import (
    get_doctor_profile_by_user,
    get_doctor_profile_by_slug,
    get_all_active_doctors,
)
from apps.patients.selectors import get_patient_profile
from apps.assistants.selectors import get_assistant_profile, get_assistant_workplaces

__all__ = [
    "get_active_user_by_id",
    "get_active_user_by_email",
    "get_active_user_by_username",
    "get_doctor_profile_by_user",
    "get_doctor_profile_by_slug",
    "get_all_active_doctors",
    "get_patient_profile",
    "get_assistant_profile",
    "get_assistant_workplaces",
]

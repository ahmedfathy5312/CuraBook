from __future__ import annotations
from typing import Optional
from .models import PatientProfile


def get_patient_profile(user) -> Optional[PatientProfile]:
    return PatientProfile.objects.select_related("user").filter(
        user=user, user__is_deleted=False
    ).first()


def get_patient_appointments(user):
    """All appointments for this patient — delegates to appointments selectors."""
    from appointments.selectors import get_appointments_for_patient
    return get_appointments_for_patient(user)

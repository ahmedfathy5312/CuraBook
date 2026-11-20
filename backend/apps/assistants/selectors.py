"""
CuraBook — Assistants Selectors
================================
All assistant queries centralized here.
"""
from __future__ import annotations
from typing import Optional
from .models import AssistantProfile


def get_assistant_profile(user) -> Optional[AssistantProfile]:
    return AssistantProfile.objects.select_related("user").filter(user=user).first()


def get_assistant_workplaces(assistant_profile: AssistantProfile) -> dict:
    """
    Returns all clinics and hospitals the assistant is assigned to.
    Used in /auth/me and assistant dashboard.
    """
    from clinics.models import ClinicAssistant
    from hospital.models import HospitalAssistant

    clinic_links = (
        ClinicAssistant.objects
        .filter(assistant=assistant_profile, is_active=True)
        .select_related("clinic", "clinic__owner__user")
    )
    hospital_links = (
        HospitalAssistant.objects
        .filter(assistant=assistant_profile, is_active=True)
        .select_related("hospital")
    )

    clinics = [
        {
            "id":      cl.clinic.id,
            "name":    cl.clinic.name,
            "slug":    cl.clinic.slug,
            "address": cl.clinic.address,
            "role":    cl.role,
            "doctor":  cl.clinic.owner.user.full_name if hasattr(cl.clinic, "owner") else None,
        }
        for cl in clinic_links
    ]
    hospitals = [
        {
            "id":      hl.hospital.id,
            "name":    hl.hospital.name,
            "address": getattr(hl.hospital, "address", ""),
            "role":    hl.role,
        }
        for hl in hospital_links
    ]
    return {"clinics": clinics, "hospitals": hospitals, "total": len(clinics) + len(hospitals)}

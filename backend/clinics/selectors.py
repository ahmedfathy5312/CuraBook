"""
CuraBook — Clinics Selectors
"""

from __future__ import annotations
from typing import Optional
from django.db.models import QuerySet


def get_active_clinics() -> QuerySet:
    from clinics.models import Clinic
    return Clinic.objects.select_related('owner__user').filter(is_active=True)


def get_clinic_by_id(clinic_id: int) -> Optional['Clinic']:
    from clinics.models import Clinic
    return Clinic.objects.select_related('owner__user').filter(pk=clinic_id, is_active=True).first()


def get_clinic_for_doctor(doctor_user) -> Optional['Clinic']:
    from clinics.models import Clinic
    return Clinic.objects.select_related('owner__user').filter(
        owner__user=doctor_user, is_active=True
    ).first()


def get_clinics_for_assistant(assistant_profile) -> QuerySet:
    from clinics.models import Clinic
    clinic_ids = list(
        assistant_profile.clinic_assignments
        .filter(is_active=True)
        .values_list('clinic_id', flat=True)
    )
    return Clinic.objects.filter(pk__in=clinic_ids, is_active=True)


def get_clinic_assistants(clinic_id: int) -> QuerySet:
    from clinics.models import ClinicAssistant
    return ClinicAssistant.objects.select_related(
        'assistant__user'
    ).filter(clinic_id=clinic_id, is_active=True)

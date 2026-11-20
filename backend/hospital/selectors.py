"""
CuraBook — Hospital Selectors
"""

from __future__ import annotations
from typing import Optional
from django.db.models import QuerySet


def get_active_hospitals() -> QuerySet:
    from hospital.models import Hospital
    return Hospital.objects.filter(is_active=True)


def get_hospital_by_id(hospital_id: int) -> Optional['Hospital']:
    from hospital.models import Hospital
    return Hospital.objects.filter(pk=hospital_id, is_active=True).first()


def get_hospitals_for_admin(user) -> QuerySet:
    from hospital.models import Hospital
    hospital_ids = list(
        user.hospital_admin_links.values_list('hospital_id', flat=True)
    )
    return Hospital.objects.filter(pk__in=hospital_ids, is_active=True)


def get_hospitals_for_assistant(assistant_profile) -> QuerySet:
    from hospital.models import Hospital
    hospital_ids = list(
        assistant_profile.hospital_assignments
        .filter(is_active=True)
        .values_list('hospital_id', flat=True)
    )
    return Hospital.objects.filter(pk__in=hospital_ids, is_active=True)


def get_hospital_doctors(hospital_id: int) -> QuerySet:
    from hospital.models import HospitalDoctor
    return HospitalDoctor.objects.select_related(
        'user__doctor_profile', 'department'
    ).filter(hospital_id=hospital_id, is_active=True)


def get_hospital_departments(hospital_id: int) -> QuerySet:
    from hospital.models import Department
    return Department.objects.filter(hospital_id=hospital_id)

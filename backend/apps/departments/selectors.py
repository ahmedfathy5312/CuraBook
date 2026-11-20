from __future__ import annotations
from typing import Optional
from django.db.models import QuerySet, Count
from .models import Department


def get_hospital_departments(hospital_id: int) -> QuerySet:
    return (
        Department.objects
        .filter(hospital_id=hospital_id, is_active=True)
        .annotate(doctor_count=Count("hospitaldoctor"))
        .order_by("name")
    )


def get_department_by_id(department_id: int, hospital_id: int) -> Optional[Department]:
    return Department.objects.filter(
        id=department_id, hospital_id=hospital_id, is_active=True
    ).first()

"""
CuraBook — Scheduling Selectors
================================
All Schedule + GeneratedSlot queries live here.
"""

from __future__ import annotations
from typing import Optional
from django.db.models import QuerySet
from datetime import datetime, time
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime


# ──────────────────────────────────────────────────────────────────────────────
# Schedule
# ──────────────────────────────────────────────────────────────────────────────

def get_schedules_for_doctor(doctor) -> QuerySet:
    from scheduling.models import Schedule
    return (
        Schedule.objects
        .select_related('clinic', 'hospital', 'doctor')
        .filter(doctor=doctor, is_active=True)
        .order_by('day_of_week', 'start_time')
    )


def get_schedules_for_clinic(clinic_id: int) -> QuerySet:
    from scheduling.models import Schedule
    return (
        Schedule.objects
        .select_related('doctor__doctor_profile', 'clinic')
        .filter(clinic_id=clinic_id, is_active=True)
        .order_by('day_of_week', 'start_time')
    )


def get_schedules_for_hospital(hospital_id: int) -> QuerySet:
    from scheduling.models import Schedule
    return (
        Schedule.objects
        .select_related('doctor__doctor_profile', 'hospital')
        .filter(hospital_id=hospital_id, is_active=True)
        .order_by('day_of_week', 'start_time')
    )


# ──────────────────────────────────────────────────────────────────────────────
# Generated Slots
# ──────────────────────────────────────────────────────────────────────────────

def get_available_slots_for_doctor(
    doctor,
    from_date=None,
    to_date=None,
    clinic_id: int = None,
    hospital_id: int = None,
) -> QuerySet:
    from scheduling.models import GeneratedSlot

    now = timezone.now()
    start_bound = _coerce_slot_boundary(from_date, end_of_day=False) if from_date else now
    end_bound = _coerce_slot_boundary(to_date, end_of_day=True) if to_date else None

    qs = (
        GeneratedSlot.objects
        .select_related('clinic', 'hospital', 'doctor')
        .filter(
            doctor=doctor,
            is_active=True,
            is_booked=False,
            start__gte=start_bound,
        )
        .order_by('start')
    )

    if end_bound:
        qs = qs.filter(start__lte=end_bound)

    if clinic_id:
        qs = qs.filter(clinic_id=clinic_id)
    elif hospital_id:
        qs = qs.filter(hospital_id=hospital_id)

    return qs


def _coerce_slot_boundary(value, *, end_of_day: bool):
    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value)
        parsed_date = parse_date(raw) if len(raw) == 10 else None
        if parsed_date is not None:
            dt = datetime.combine(parsed_date, time.max if end_of_day else time.min)
        else:
            dt = parse_datetime(raw)
            if dt is None:
                parsed_date = parse_date(raw)
                if parsed_date is None:
                    return value
                dt = datetime.combine(parsed_date, time.max if end_of_day else time.min)

    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def get_slot_by_id(slot_id: int) -> Optional['GeneratedSlot']:
    from scheduling.models import GeneratedSlot
    return GeneratedSlot.objects.filter(pk=slot_id).select_related(
        'clinic', 'hospital', 'doctor'
    ).first()


def get_slot_locked(slot_id: int) -> Optional['GeneratedSlot']:
    """SELECT FOR UPDATE — use inside transaction.atomic()."""
    from scheduling.models import GeneratedSlot
    return (
        GeneratedSlot.objects
        .select_for_update()
        .select_related('clinic', 'hospital')
        .filter(pk=slot_id, is_active=True)
        .first()
    )


def get_upcoming_slots_for_clinic(clinic_id: int, limit: int = 50) -> QuerySet:
    from scheduling.models import GeneratedSlot
    return (
        GeneratedSlot.objects
        .select_related('doctor__doctor_profile')
        .filter(
            clinic_id=clinic_id,
            is_active=True,
            is_booked=False,
            start__gte=timezone.now(),
        )
        .order_by('start')[:limit]
    )

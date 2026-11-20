"""
CuraBook — Appointment Selectors
=================================
ALL appointment queries live here.
Views and services MUST NOT query Appointment directly.

Every selector:
  • Uses select_related / prefetch_related
  • Respects role-based scoping
  • Accepts optional pagination params
  • Is easily testable in isolation
"""

from __future__ import annotations

from typing import Optional

from django.db.models import QuerySet, Q, Prefetch

from appointments.models import Appointment, AppointmentHistory


# ──────────────────────────────────────────────────────────────────────────────
# Base queryset (always used as starting point)
# ──────────────────────────────────────────────────────────────────────────────

def _base_qs(tenant=None) -> QuerySet:
    # MED-08 FIX: Comprehensive select_related to prevent N+1 queries.
    # Covers all FK chains accessed in serializers:
    #   doctor.full_name, doctor.doctor_profile.specialty (AppointmentListSerializer)
    #   patient.full_name, slot.start/end, clinic.name, hospital.name
    # SEC-01 FIX: tenant scoping — filter by clinic__tenant or hospital__tenant
    # to prevent cross-tenant data leaks. Pass tenant=None only for platform admins.
    qs = (
        Appointment.objects
        .select_related(
            'patient',
            'patient__patient_profile',
            'doctor',
            'doctor__doctor_profile',        # prevents N+1 for doctor_specialty field
            'clinic',
            'clinic__owner',
            'clinic__owner__user',
            'hospital',
            'slot',
        )
        .prefetch_related(
            # MED-05 FIX companion: history ordered by created_at (the real field name)
            Prefetch('history', queryset=AppointmentHistory.objects.order_by('created_at'))
        )
    )
    if tenant is not None:
        qs = qs.filter(
            Q(clinic__tenant=tenant) | Q(hospital__tenant=tenant)
        )
    return qs


# ──────────────────────────────────────────────────────────────────────────────
# Scoped selectors — one per role
# ──────────────────────────────────────────────────────────────────────────────

def get_appointments_for_patient(patient, tenant=None) -> QuerySet:
    """Patient sees only their OWN appointments, scoped to tenant."""
    return _base_qs(tenant=tenant).filter(patient=patient)


def get_appointments_for_doctor(doctor, tenant=None) -> QuerySet:
    """Doctor sees only appointments WHERE they are the doctor, scoped to tenant."""
    return _base_qs(tenant=tenant).filter(doctor=doctor)


def get_appointments_for_assistant(assistant_profile, tenant=None) -> QuerySet:
    """
    Assistant sees all appointments across ALL their active
    clinic AND hospital assignments, scoped to tenant.
    """
    clinic_ids = list(
        assistant_profile.clinic_assignments
        .filter(is_active=True)
        .values_list('clinic_id', flat=True)
    )
    hospital_ids = list(
        assistant_profile.hospital_assignments
        .filter(is_active=True)
        .values_list('hospital_id', flat=True)
    )

    if not clinic_ids and not hospital_ids:
        return Appointment.objects.none()

    return _base_qs(tenant=tenant).filter(
        Q(clinic_id__in=clinic_ids) |
        Q(hospital_id__in=hospital_ids)
    )


def get_appointments_for_hospital_admin(user, tenant=None) -> QuerySet:
    """Hospital admin sees all appointments in their hospitals, scoped to tenant."""
    hospital_ids = list(
        user.hospital_admin_links.values_list('hospital_id', flat=True)
    )
    if not hospital_ids:
        return Appointment.objects.none()
    return _base_qs(tenant=tenant).filter(hospital_id__in=hospital_ids)


def get_all_appointments() -> QuerySet:
    """Platform admin — unrestricted (no tenant filter intentionally)."""
    return _base_qs(tenant=None)


# ──────────────────────────────────────────────────────────────────────────────
# Single-object lookups
# ──────────────────────────────────────────────────────────────────────────────

def get_appointment_by_id(appointment_id: int, tenant=None) -> Optional[Appointment]:
    return _base_qs(tenant=tenant).filter(pk=appointment_id).first()


def get_appointment_by_id_for_patient(appointment_id: int, patient, tenant=None) -> Optional[Appointment]:
    return _base_qs(tenant=tenant).filter(pk=appointment_id, patient=patient).first()


def get_appointment_by_id_for_doctor(appointment_id: int, doctor, tenant=None) -> Optional[Appointment]:
    return _base_qs(tenant=tenant).filter(pk=appointment_id, doctor=doctor).first()


# ──────────────────────────────────────────────────────────────────────────────
# Filtered selectors
# ──────────────────────────────────────────────────────────────────────────────

def get_pending_appointments_for_doctor(doctor) -> QuerySet:
    return get_appointments_for_doctor(doctor).filter(
        status=Appointment.Status.PENDING
    )


def get_confirmed_appointments_for_doctor(doctor) -> QuerySet:
    return get_appointments_for_doctor(doctor).filter(
        status=Appointment.Status.CONFIRMED
    )


def get_expired_pending_appointments() -> QuerySet:
    """Used by Celery task to auto-expire stale PENDING bookings."""
    from django.utils import timezone
    return (
        Appointment.objects
        .select_related('slot')
        .filter(
            status=Appointment.Status.PENDING,
            expires_at__lt=timezone.now(),
        )
    )


def get_appointments_due_for_reminder() -> QuerySet:
    """
    CONFIRMED appointments whose slot starts within the next 24-25 hours
    AND whose 24h reminder has not been sent yet (idempotency guard).
    The guard prevents duplicate sends when Celery retries or Beat fires
    multiple times within the same window.
    """
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    window_start = now + timedelta(hours=24)
    window_end   = now + timedelta(hours=25)

    return (
        Appointment.objects
        .select_related('patient', 'doctor', 'slot', 'clinic', 'hospital')
        .filter(
            status=Appointment.Status.CONFIRMED,
            reminder_24h_sent_at__isnull=True,   # ← idempotency guard
            slot__start__gte=window_start,
            slot__start__lte=window_end,
        )
    )


# ──────────────────────────────────────────────────────────────────────────────
# Dashboard / aggregation helpers
# ──────────────────────────────────────────────────────────────────────────────

def get_appointment_stats_for_doctor(doctor) -> dict:
    from django.db.models import Count
    qs = Appointment.objects.filter(doctor=doctor)
    stats = qs.values('status').annotate(count=Count('id'))
    return {row['status']: row['count'] for row in stats}


def get_appointment_stats_for_hospital(hospital_id: int) -> dict:
    from django.db.models import Count
    qs = Appointment.objects.filter(hospital_id=hospital_id)
    stats = qs.values('status').annotate(count=Count('id'))
    return {row['status']: row['count'] for row in stats}


def get_appointments_due_for_1h_reminder() -> QuerySet:
    """
    CONFIRMED appointments whose slot starts within the next 1-2 hours
    AND whose 1h reminder has not been sent yet (idempotency guard).
    Used by the 1-hour reminder Celery task.
    """
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    window_start = now + timedelta(hours=1)
    window_end   = now + timedelta(hours=2)

    return (
        Appointment.objects
        .select_related('patient', 'doctor', 'slot', 'clinic', 'hospital')
        .filter(
            status=Appointment.Status.CONFIRMED,
            reminder_1h_sent_at__isnull=True,    # ← idempotency guard
            slot__start__gte=window_start,
            slot__start__lte=window_end,
        )
    )

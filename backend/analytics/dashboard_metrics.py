"""
CuraBook — Dashboard Metrics with Caching
==========================================
Heavy COUNT queries are cached in Redis to avoid hammering the DB
on every dashboard load.

Cache TTL: 5 minutes (configurable)
Invalidated: on Appointment status changes via signal
"""

import logging
from django.core.cache import cache
from django.db.models import Count, Q

logger = logging.getLogger('curabook')

METRICS_TTL = 60 * 5   # 5 minutes


def _metrics_key(scope: str, scope_id: int = None) -> str:
    if scope_id:
        return f'dashboard:metrics:{scope}:{scope_id}'
    return f'dashboard:metrics:{scope}'


# ─────────────────────────────────────────────────────
# Doctor Dashboard
# ─────────────────────────────────────────────────────

def get_doctor_dashboard_metrics(doctor_user) -> dict:
    """
    Returns appointment counts per status for a doctor.
    Cached for 5 minutes.
    """
    cache_key = _metrics_key('doctor', doctor_user.id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from appointments.models import Appointment

    # Single DB hit — annotated counts
    rows = (
        Appointment.objects
        .filter(doctor=doctor_user)
        .values('status')
        .annotate(count=Count('id'))
    )
    counts = {row['status']: row['count'] for row in rows}

    metrics = {
        'pending':   counts.get('PENDING',   0),
        'confirmed': counts.get('CONFIRMED', 0),
        'completed': counts.get('COMPLETED', 0),
        'cancelled': counts.get('CANCELLED', 0),
        'rejected':  counts.get('REJECTED',  0),
        'total':     sum(counts.values()),
    }

    cache.set(cache_key, metrics, timeout=METRICS_TTL)
    return metrics


# ─────────────────────────────────────────────────────
# Hospital Admin Dashboard
# ─────────────────────────────────────────────────────

def get_hospital_dashboard_metrics(hospital_id: int) -> dict:
    cache_key = _metrics_key('hospital', hospital_id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from appointments.models import Appointment
    from hospital.models import Hospital, HospitalDoctor

    rows = (
        Appointment.objects
        .filter(hospital_id=hospital_id)
        .values('status')
        .annotate(count=Count('id'))
    )
    counts = {row['status']: row['count'] for row in rows}

    doctor_count = HospitalDoctor.objects.filter(
        hospital_id=hospital_id, is_active=True
    ).count()

    metrics = {
        'pending':      counts.get('PENDING',   0),
        'confirmed':    counts.get('CONFIRMED', 0),
        'completed':    counts.get('COMPLETED', 0),
        'cancelled':    counts.get('CANCELLED', 0),
        'total':        sum(counts.values()),
        'doctor_count': doctor_count,
    }

    cache.set(cache_key, metrics, timeout=METRICS_TTL)
    return metrics



# ─────────────────────────────────────────────────────
# Clinic Dashboard
# ─────────────────────────────────────────────────────

def get_clinic_dashboard_metrics(clinic_id: int) -> dict:
    """Returns appointment/slot counts for a clinic. Cached 5 minutes."""
    cache_key = _metrics_key('clinic', clinic_id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from appointments.models import Appointment
    from scheduling.models import GeneratedSlot
    from clinics.models import ClinicStaff

    appt_rows = (
        Appointment.objects
        .filter(clinic_id=clinic_id)
        .values('status')
        .annotate(count=Count('id'))
    )
    appt_counts = {row['status']: row['count'] for row in appt_rows}

    total_slots  = GeneratedSlot.objects.filter(clinic_id=clinic_id).count()
    booked_slots = GeneratedSlot.objects.filter(clinic_id=clinic_id, is_booked=True).count()
    total_staff  = ClinicStaff.objects.filter(clinic_id=clinic_id).count()
    active_staff = ClinicStaff.objects.filter(clinic_id=clinic_id, is_active=True).count()

    metrics = {
        'total_patients':         sum(appt_counts.values()),
        'total_slots':            total_slots,
        'booked_slots':           booked_slots,
        'booked_percentage':      round(booked_slots / total_slots * 100, 2) if total_slots else 0,
        'total_staff':            total_staff,
        'active_staff':           active_staff,
        'staff_active_percentage': round(active_staff / total_staff * 100, 2) if total_staff else 0,
        'appointments': {
            'pending':   appt_counts.get('PENDING',   0),
            'confirmed': appt_counts.get('CONFIRMED', 0),
            'completed': appt_counts.get('COMPLETED', 0),
            'cancelled': appt_counts.get('CANCELLED', 0),
        },
    }

    cache.set(cache_key, metrics, timeout=METRICS_TTL)
    return metrics


def invalidate_clinic_metrics(clinic_id: int):
    cache.delete(_metrics_key('clinic', clinic_id))
    logger.debug(f'[Dashboard] Invalidated metrics for clinic_{clinic_id}')

# ─────────────────────────────────────────────────────
# Platform Admin Dashboard
# ─────────────────────────────────────────────────────

def get_platform_dashboard_metrics() -> dict:
    cache_key = _metrics_key('platform')
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from appointments.models import Appointment
    from django.contrib.auth import get_user_model
    from clinics.models import Clinic
    from hospital.models import Hospital

    User = get_user_model()

    appt_rows = (
        Appointment.objects
        .values('status')
        .annotate(count=Count('id'))
    )
    appt_counts = {row['status']: row['count'] for row in appt_rows}

    metrics = {
        'appointments': {
            'pending':   appt_counts.get('PENDING',   0),
            'confirmed': appt_counts.get('CONFIRMED', 0),
            'completed': appt_counts.get('COMPLETED', 0),
            'total':     sum(appt_counts.values()),
        },
        'users': {
            'doctors':   User.objects.filter(is_doctor=True,   is_active=True, is_deleted=False).count(),
            'patients':  User.objects.filter(is_patient=True,  is_active=True, is_deleted=False).count(),
            'assistants': User.objects.filter(is_assistant=True, is_active=True, is_deleted=False).count(),
        },
        'clinics':   Clinic.objects.filter(is_active=True).count(),
        'hospitals': Hospital.objects.filter(is_active=True).count(),
    }

    cache.set(cache_key, metrics, timeout=METRICS_TTL)
    return metrics


# ─────────────────────────────────────────────────────
# Cache Invalidation
# ─────────────────────────────────────────────────────

def invalidate_doctor_metrics(doctor_id: int):
    cache.delete(_metrics_key('doctor', doctor_id))
    logger.debug(f'[Dashboard] Invalidated metrics for doctor_{doctor_id}')


def invalidate_hospital_metrics(hospital_id: int):
    cache.delete(_metrics_key('hospital', hospital_id))
    logger.debug(f'[Dashboard] Invalidated metrics for hospital_{hospital_id}')


def invalidate_platform_metrics():
    cache.delete(_metrics_key('platform'))

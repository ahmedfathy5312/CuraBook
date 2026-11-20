"""
CuraBook — Dashboard Selectors
================================
All dashboard queries centralized. Never write raw queries in views.
Results are cached in Redis to prevent heavy repeated joins (Bug #15).
Cache TTL: 2 minutes — short enough to stay fresh, long enough to reduce DB load.
"""

from django.db.models import Count, Q
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model

# MED-03 FIX: Replace lazy (inside-function) imports with canonical top-level imports.
# hospital/models.py re-exports Department from apps.departments — importing via that
# re-export adds a fragile indirection. Import from the canonical source directly.
from appointments.models import Appointment
from hospital.models import Hospital, HospitalDoctor, HospitalAssistant
try:
    from apps.departments.models import Department
except ImportError:
    from hospital.models import Department  # fallback for alternate project layouts

# Cache TTL in seconds
_DASHBOARD_TTL = 120  # 2 minutes


def _cache_key(role: str, identifier) -> str:
    return f"dashboard:{role}:{identifier}"


def get_assistant_dashboard_data(user) -> dict:
    """
    Unified dashboard for assistants.
    Collects ALL appointments across ALL assigned clinics + hospitals.
    Cached per user for 2 minutes.
    """
    key = _cache_key("assistant", user.id)
    cached = cache.get(key)
    if cached is not None:
        return cached

    from apps.assistants.models import AssistantProfile
    from clinics.models import ClinicAssistant

    today = timezone.now().date()

    try:
        profile = user.assistant_profile
    except AssistantProfile.DoesNotExist:
        return {"error": "Assistant profile not found."}

    # Collect all clinic IDs and hospital IDs this assistant manages
    clinic_ids = list(
        ClinicAssistant.objects
        .filter(assistant=profile, is_active=True)
        .values_list("clinic_id", flat=True)
    )
    hospital_ids = list(
        HospitalAssistant.objects
        .filter(assistant=profile, is_active=True)
        .values_list("hospital_id", flat=True)
    )

    # Union query: all appointments across all workplaces
    qs = Appointment.objects.filter(
        Q(clinic_id__in=clinic_ids) | Q(hospital_id__in=hospital_ids)
    )

    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        rejected=Count("id", filter=Q(status="REJECTED")),
        cancelled=Count("id", filter=Q(status="CANCELLED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )

    # Next pending appointment to act on
    next_pending = (
        qs.filter(status="PENDING")
        .order_by("slot__start")
        .select_related("patient", "doctor__doctor_profile", "slot", "clinic", "hospital")
        .first()
    )

    result = {
        "workplaces": {
            "clinics":   len(clinic_ids),
            "hospitals": len(hospital_ids),
            "total":     len(clinic_ids) + len(hospital_ids),
        },
        "appointments": {
            "total":     counts["total"],
            "pending":   counts["pending"],
            "confirmed": counts["confirmed"],
            "completed": counts["completed"],
            "rejected":  counts["rejected"],
            "cancelled": counts["cancelled"],
            "today":     counts["today"],
        },
        "next_pending": {
            "id":       next_pending.id,
            "patient":  next_pending.patient.full_name if next_pending else None,
            "doctor":   next_pending.doctor.full_name if next_pending else None,
            "location": str(next_pending.clinic or next_pending.hospital) if next_pending else None,
            "datetime": next_pending.slot.start.isoformat() if next_pending else None,
        } if next_pending else None,
    }

    cache.set(key, result, timeout=_DASHBOARD_TTL)
    return result


def get_doctor_dashboard_data(user) -> dict:
    """Summary stats for a doctor's dashboard. Cached per doctor for 2 minutes."""
    key = _cache_key("doctor", user.id)
    cached = cache.get(key)
    if cached is not None:
        return cached

    from reviews.models import Review
    from django.db.models import Avg

    today = timezone.now().date()

    qs = Appointment.objects.filter(doctor=user)
    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        cancelled=Count("id", filter=Q(status="CANCELLED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )
    rating = Review.objects.filter(doctor=user).aggregate(
        avg=Avg("rating"), total=Count("id")
    )
    next_slot = (
        qs.filter(status="CONFIRMED", slot__start__gte=timezone.now())
        .order_by("slot__start")
        .values_list("slot__start", flat=True)
        .first()
    )
    result = {
        "total_appointments":  counts["total"],
        "pending":             counts["pending"],
        "confirmed":           counts["confirmed"],
        "completed":           counts["completed"],
        "cancelled":           counts["cancelled"],
        "avg_rating":          round(rating["avg"], 2) if rating["avg"] else None,
        "total_reviews":       rating["total"],
        "today_appointments":  counts["today"],
        "next_slot":           next_slot,
    }

    cache.set(key, result, timeout=_DASHBOARD_TTL)
    return result


def get_hospital_dashboard_data(hospital) -> dict:
    """Summary stats for a hospital admin dashboard. Cached per hospital."""
    key = _cache_key("hospital", hospital.id)
    cached = cache.get(key)
    if cached is not None:
        return cached


    today = timezone.now().date()
    qs = Appointment.objects.filter(hospital=hospital)
    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )
    result = {
        "hospital_name":       hospital.name,
        "total_departments":   Department.objects.filter(hospital=hospital).count(),
        "total_doctors":       HospitalDoctor.objects.filter(hospital=hospital).count(),
        "total_appointments":  counts["total"],
        "pending":             counts["pending"],
        "confirmed":           counts["confirmed"],
        "completed":           counts["completed"],
        "today_appointments":  counts["today"],
    }

    cache.set(key, result, timeout=_DASHBOARD_TTL)
    return result


def get_platform_dashboard_data() -> dict:
    """Platform-wide stats for admin. Cached for 2 minutes."""
    key = _cache_key("platform", "global")
    cached = cache.get(key)
    if cached is not None:
        return cached

    from django.contrib.auth import get_user_model
    from clinics.models import Clinic

    User = get_user_model()
    today = timezone.now().date()
    result = {
        "total_users":         User.objects.filter(is_active=True, is_deleted=False).count(),
        "total_doctors":       User.objects.filter(is_doctor=True, is_active=True).count(),
        "total_patients":      User.objects.filter(is_patient=True, is_active=True).count(),
        "total_hospitals":     Hospital.objects.filter(is_active=True).count(),
        "total_clinics":       Clinic.objects.count(),
        "total_appointments":  Appointment.objects.count(),
        "appointments_today":  Appointment.objects.filter(slot__start__date=today).count(),
    }

    cache.set(key, result, timeout=_DASHBOARD_TTL)
    return result


def invalidate_dashboard_cache(user=None, hospital=None):
    """
    Call this after any appointment status change to bust stale dashboard data.
    Used by appointment signals/services.
    """
    if user:
        cache.delete(_cache_key("doctor",    user.id))
        cache.delete(_cache_key("assistant", user.id))
    if hospital:
        cache.delete(_cache_key("hospital", hospital.id))
    # Always bust platform cache
    cache.delete(_cache_key("platform", "global"))

    """
    Unified dashboard for assistants.
    Collects ALL appointments across ALL assigned clinics + hospitals.
    """
    from apps.assistants.models import AssistantProfile
    from clinics.models import ClinicAssistant

    today = timezone.now().date()

    try:
        profile = user.assistant_profile
    except AssistantProfile.DoesNotExist:
        return {"error": "Assistant profile not found."}

    # Collect all clinic IDs and hospital IDs this assistant manages
    clinic_ids = list(
        ClinicAssistant.objects
        .filter(assistant=profile, is_active=True)
        .values_list("clinic_id", flat=True)
    )
    hospital_ids = list(
        HospitalAssistant.objects
        .filter(assistant=profile, is_active=True)
        .values_list("hospital_id", flat=True)
    )

    # Union query: all appointments across all workplaces
    qs = Appointment.objects.filter(
        Q(clinic_id__in=clinic_ids) | Q(hospital_id__in=hospital_ids)
    )

    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        rejected=Count("id", filter=Q(status="REJECTED")),
        cancelled=Count("id", filter=Q(status="CANCELLED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )

    # Next pending appointment to act on
    next_pending = (
        qs.filter(status="PENDING")
        .order_by("slot__start")
        .select_related("patient", "doctor__doctor_profile", "slot", "clinic", "hospital")
        .first()
    )

    return {
        "workplaces": {
            "clinics":   len(clinic_ids),
            "hospitals": len(hospital_ids),
            "total":     len(clinic_ids) + len(hospital_ids),
        },
        "appointments": {
            "total":     counts["total"],
            "pending":   counts["pending"],
            "confirmed": counts["confirmed"],
            "completed": counts["completed"],
            "rejected":  counts["rejected"],
            "cancelled": counts["cancelled"],
            "today":     counts["today"],
        },
        "next_pending": {
            "id":       next_pending.id,
            "patient":  next_pending.patient.full_name if next_pending else None,
            "doctor":   next_pending.doctor.full_name if next_pending else None,
            "location": str(next_pending.clinic or next_pending.hospital) if next_pending else None,
            "datetime": next_pending.slot.start.isoformat() if next_pending else None,
        } if next_pending else None,
    }


def get_doctor_dashboard_data(user) -> dict:
    """Summary stats for a doctor's dashboard."""
    from reviews.models import Review
    from django.db.models import Avg

    today = timezone.now().date()

    qs = Appointment.objects.filter(doctor=user)
    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        cancelled=Count("id", filter=Q(status="CANCELLED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )
    rating = Review.objects.filter(doctor=user).aggregate(
        avg=Avg("rating"), total=Count("id")
    )
    next_slot = (
        qs.filter(status="CONFIRMED", slot__start__gte=timezone.now())
        .order_by("slot__start")
        .values_list("slot__start", flat=True)
        .first()
    )
    return {
        "total_appointments":  counts["total"],
        "pending":             counts["pending"],
        "confirmed":           counts["confirmed"],
        "completed":           counts["completed"],
        "cancelled":           counts["cancelled"],
        "avg_rating":          round(rating["avg"], 2) if rating["avg"] else None,
        "total_reviews":       rating["total"],
        "today_appointments":  counts["today"],
        "next_slot":           next_slot,
    }


def get_hospital_dashboard_data(hospital) -> dict:
    """Summary stats for a hospital admin dashboard."""

    today = timezone.now().date()
    qs = Appointment.objects.filter(hospital=hospital)
    counts = qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        confirmed=Count("id", filter=Q(status="CONFIRMED")),
        completed=Count("id", filter=Q(status="COMPLETED")),
        today=Count("id", filter=Q(slot__start__date=today)),
    )
    return {
        "hospital_name":       hospital.name,
        "total_departments":   Department.objects.filter(hospital=hospital).count(),
        "total_doctors":       HospitalDoctor.objects.filter(hospital=hospital).count(),
        "total_appointments":  counts["total"],
        "pending":             counts["pending"],
        "confirmed":           counts["confirmed"],
        "completed":           counts["completed"],
        "today_appointments":  counts["today"],
    }


def get_platform_dashboard_data() -> dict:
    """Platform-wide stats for admin."""
    from django.contrib.auth import get_user_model
    from clinics.models import Clinic

    User = get_user_model()
    today = timezone.now().date()
    return {
        "total_users":         User.objects.filter(is_active=True, is_deleted=False).count(),
        "total_doctors":       User.objects.filter(is_doctor=True, is_active=True).count(),
        "total_patients":      User.objects.filter(is_patient=True, is_active=True).count(),
        "total_hospitals":     Hospital.objects.filter(is_active=True).count(),
        "total_clinics":       Clinic.objects.count(),
        "total_appointments":  Appointment.objects.count(),
        "appointments_today":  Appointment.objects.filter(slot__start__date=today).count(),
    }

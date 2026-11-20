"""
CuraBook — Enterprise Permission Policies
==========================================
Strict role-based + object-level permission matrix.

All object-level checks live HERE, not scattered across views.

Policy classes follow DRF BasePermission interface:
  has_permission(request, view)       → view-level gate
  has_object_permission(request, view, obj)  → object-level gate

Import in views:
    from core.permissions.policies import (
        AppointmentPolicy,
        ClinicPolicy,
        HospitalPolicy,
        SchedulePolicy,
        UserProfilePolicy,
    )
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ─────────────────────────────────────────────────────────────────────────────
# Internal role helpers (no DB hits — use cached model flags)
# ─────────────────────────────────────────────────────────────────────────────

def _is_doctor(user) -> bool:
    return bool(getattr(user, 'is_doctor', False))

def _is_patient(user) -> bool:
    return bool(getattr(user, 'is_patient', False))

def _is_assistant(user) -> bool:
    return bool(getattr(user, 'is_assistant', False))

def _is_hospital_admin(user) -> bool:
    return bool(getattr(user, 'hospital_admin', False))

def _is_platform_admin(user) -> bool:
    return bool(getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False))


# ─────────────────────────────────────────────────────────────────────────────
# Base policy mixin — authenticated guard
# ─────────────────────────────────────────────────────────────────────────────

class _AuthMixin:
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Appointment Policy
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentPolicy(_AuthMixin, BasePermission):
    """
    View-level:  Any authenticated user can list/retrieve (scoped by get_queryset).
    Object-level:
      • Patient   → only OWN appointments
      • Doctor    → only appointments WHERE doctor == self
      • Assistant → only appointments in their assigned clinics/hospitals
      • HospAdmin → only appointments in their hospitals
      • PlatAdmin → everything
    """

    message = "You do not have permission to access this appointment."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        if _is_patient(user):
            return obj.patient_id == user.id

        if _is_doctor(user):
            return obj.doctor_id == user.id

        if _is_assistant(user):
            return _assistant_manages_appointment(user, obj)

        if _is_hospital_admin(user):
            if not obj.hospital_id:
                return False
            return user.hospital_admin_links.filter(
                hospital_id=obj.hospital_id
            ).exists()

        return False


def _assistant_manages_appointment(user, appointment) -> bool:
    """True if this assistant is assigned to the clinic/hospital of appointment."""
    try:
        ap = user.assistant_profile
    except Exception:
        return False

    if appointment.clinic_id:
        from clinics.models import ClinicAssistant
        return ClinicAssistant.objects.filter(
            assistant=ap,
            clinic_id=appointment.clinic_id,
            is_active=True,
        ).exists()

    if appointment.hospital_id:
        from hospital.models import HospitalAssistant
        return HospitalAssistant.objects.filter(
            assistant=ap,
            hospital_id=appointment.hospital_id,
            is_active=True,
        ).exists()

    return False


# ─────────────────────────────────────────────────────────────────────────────
# 2. Clinic Policy
# ─────────────────────────────────────────────────────────────────────────────

class ClinicPolicy(_AuthMixin, BasePermission):
    """
    Read (SAFE_METHODS): any authenticated user.
    Write:
      • Doctor    → only their OWN clinic
      • Assistant → read-only on assigned clinics
      • PlatAdmin → full access
    """

    message = "You do not have permission to modify this clinic."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        # Safe reads allowed for all authenticated users
        if request.method in SAFE_METHODS:
            return True

        # Only the owning doctor may mutate their clinic
        if _is_doctor(user):
            try:
                return obj.owner.user_id == user.id
            except Exception:
                return False

        # Assistants are read-only on clinics
        if _is_assistant(user):
            return request.method in SAFE_METHODS

        return False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Hospital Policy
# ─────────────────────────────────────────────────────────────────────────────

class HospitalPolicy(_AuthMixin, BasePermission):
    """
    Read: any authenticated user.
    Write:
      • HospitalAdmin → only their OWN hospitals
      • PlatAdmin     → full access
    """

    message = "You do not have permission to modify this hospital."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        if request.method in SAFE_METHODS:
            return True

        if _is_hospital_admin(user):
            return user.hospital_admin_links.filter(
                hospital_id=obj.id
            ).exists()

        return False


# ─────────────────────────────────────────────────────────────────────────────
# 4. Schedule Policy
# ─────────────────────────────────────────────────────────────────────────────

class SchedulePolicy(_AuthMixin, BasePermission):
    """
    Read:  Doctor (own), Assistant (assigned), HospAdmin (their hospitals), PlatAdmin.
    Write: Doctor (own schedule only), PlatAdmin.
    """

    message = "You do not have permission to access this schedule."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        if _is_doctor(user):
            # Can fully manage their own schedule
            return obj.doctor_id == user.id

        if _is_assistant(user):
            # Assistants can only read schedules in their assigned locations
            if request.method not in SAFE_METHODS:
                return False
            return _assistant_manages_schedule(user, obj)

        if _is_hospital_admin(user):
            if request.method not in SAFE_METHODS:
                return False
            if not obj.hospital_id:
                return False
            return user.hospital_admin_links.filter(
                hospital_id=obj.hospital_id
            ).exists()

        return False


def _assistant_manages_schedule(user, schedule) -> bool:
    try:
        ap = user.assistant_profile
    except Exception:
        return False

    if schedule.clinic_id:
        from clinics.models import ClinicAssistant
        return ClinicAssistant.objects.filter(
            assistant=ap, clinic_id=schedule.clinic_id, is_active=True
        ).exists()

    if schedule.hospital_id:
        from hospital.models import HospitalAssistant
        return HospitalAssistant.objects.filter(
            assistant=ap, hospital_id=schedule.hospital_id, is_active=True
        ).exists()

    return False


# ─────────────────────────────────────────────────────────────────────────────
# 5. User Profile Policy
# ─────────────────────────────────────────────────────────────────────────────

class UserProfilePolicy(_AuthMixin, BasePermission):
    """
    Users can only access/edit their OWN profile.
    PlatAdmin can read/write any profile.
    """

    message = "You cannot access another user's data."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        # obj can be User, DoctorProfile, PatientProfile, AssistantProfile
        # Normalise to user id
        obj_user_id = getattr(obj, 'user_id', None) or getattr(obj, 'id', None)
        return obj_user_id == user.id


# ─────────────────────────────────────────────────────────────────────────────
# 6. Notification Policy
# ─────────────────────────────────────────────────────────────────────────────

class NotificationPolicy(_AuthMixin, BasePermission):
    """Users can only access their OWN notifications."""

    message = "You cannot access another user's notifications."

    def has_object_permission(self, request, view, obj):
        if _is_platform_admin(request.user):
            return True
        return obj.user_id == request.user.id


# ─────────────────────────────────────────────────────────────────────────────
# 7. Review Policy
# ─────────────────────────────────────────────────────────────────────────────

class ReviewPolicy(_AuthMixin, BasePermission):
    """
    Read:   any authenticated user.
    Create: patients only (checked in view).
    Update/Delete: review owner (patient) or PlatAdmin.
    """

    message = "You do not have permission to modify this review."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        if request.method in SAFE_METHODS:
            return True

        return obj.patient_id == user.id


# ─────────────────────────────────────────────────────────────────────────────
# 8. Audit Log Policy (read-only, admin only)
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogPolicy(_AuthMixin, BasePermission):
    """Only platform admins and hospital admins can read audit logs."""

    message = "Audit logs are available to admins only."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        user = request.user
        return _is_platform_admin(user) or _is_hospital_admin(user)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if _is_platform_admin(user):
            return True

        # Hospital admin: only audit logs for their hospitals
        if _is_hospital_admin(user):
            hospital_ids = set(
                user.hospital_admin_links.values_list('hospital_id', flat=True)
            )
            # Check via metadata
            log_hospital = obj.metadata.get('hospital_id')
            if log_hospital:
                return int(log_hospital) in hospital_ids
            return False

        return False

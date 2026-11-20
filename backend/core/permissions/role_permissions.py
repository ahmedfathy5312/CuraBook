"""
CuraBook — Role-Based Permission Classes
==========================================
Centralized role checks for all CuraBook views.

All role flags come from the User model (no DB queries on every request):
  user.is_doctor
  user.is_patient
  user.is_assistant
  user.hospital_admin
  user.is_staff  (= platform admin)

Usage:
    from core.permissions import IsDoctor, IsPatient, IsAssistant

    class MyView(APIView):
        permission_classes = [IsDoctor]
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ─────────────────────────────────────────────────────────────────────────────
# Role helpers (no DB — read cached model flags)
# ─────────────────────────────────────────────────────────────────────────────

def _authenticated(user) -> bool:
    return bool(user and user.is_authenticated and user.is_active)

def _is_doctor(user) -> bool:
    return bool(getattr(user, "is_doctor", False))

def _is_patient(user) -> bool:
    return bool(getattr(user, "is_patient", False))

def _is_assistant(user) -> bool:
    return bool(getattr(user, "is_assistant", False))

def _is_hospital_admin(user) -> bool:
    return bool(getattr(user, "hospital_admin", False))

def _is_platform_admin(user) -> bool:
    return bool(getattr(user, "is_platform_admin", False) or getattr(user, "is_staff", False))


# ─────────────────────────────────────────────────────────────────────────────
# Base permission mixin
# ─────────────────────────────────────────────────────────────────────────────

class _ActiveAuthMixin:
    """Require authenticated + active user on every request."""
    def has_permission(self, request, view) -> bool:
        return _authenticated(request.user)


# ─────────────────────────────────────────────────────────────────────────────
# Role permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsAuthenticatedAndActive(_ActiveAuthMixin, BasePermission):
    """Authenticated + active user (any role)."""
    message = "Authentication required."


class IsDoctor(_ActiveAuthMixin, BasePermission):
    """Only doctors."""
    message = "This operation is available to doctors only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_doctor(request.user)


class IsPatient(_ActiveAuthMixin, BasePermission):
    """Only patients."""
    message = "This operation is available to patients only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_patient(request.user)


class IsAssistant(_ActiveAuthMixin, BasePermission):
    """Only assistants."""
    message = "This operation is available to assistants only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_assistant(request.user)


class IsHospitalAdmin(_ActiveAuthMixin, BasePermission):
    """Only hospital admins."""
    message = "This operation is available to hospital admins only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_hospital_admin(request.user)


class IsPlatformAdmin(_ActiveAuthMixin, BasePermission):
    """Only platform (staff) admins."""
    message = "This operation is available to platform admins only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_platform_admin(request.user)


# ─────────────────────────────────────────────────────────────────────────────
# Composite role permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsDoctorOrPatient(_ActiveAuthMixin, BasePermission):
    """Doctors or patients."""
    message = "This operation is available to doctors and patients only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        return _is_doctor(request.user) or _is_patient(request.user)


class IsDoctorOrReadOnly(_ActiveAuthMixin, BasePermission):
    """Read for anyone authenticated; write only for doctors."""
    message = "Write operations are available to doctors only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_doctor(request.user)


class IsHospitalAdminOrDoctorReadOnly(_ActiveAuthMixin, BasePermission):
    """Write for hospital admins; read-only for doctors."""
    message = "Write operations are available to hospital admins only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        if _is_hospital_admin(request.user):
            return True
        if _is_doctor(request.user) and request.method in SAFE_METHODS:
            return True
        return False


class CanManageDoctors(_ActiveAuthMixin, BasePermission):
    """Hospital admins and platform admins can manage doctor assignments."""
    message = "Doctor management is available to admins only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        return _is_hospital_admin(request.user) or _is_platform_admin(request.user)


class CanAccessMedicalData(_ActiveAuthMixin, BasePermission):
    """Only doctors, assistants, and platform admins can access medical records."""
    message = "Medical data is available to doctors and medical assistants only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        u = request.user
        if _is_assistant(u):
            profile = getattr(u, 'assistant_profile', None)
            return bool(profile and profile.effective_permissions().get('view_patient_records', False))
        return _is_doctor(u) or _is_platform_admin(u)


# ─────────────────────────────────────────────────────────────────────────────
# Ownership permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsOwnerOrReadOnly(_ActiveAuthMixin, BasePermission):
    """
    Read for all authenticated; write only for the object owner.
    Object must have a .user or .user_id attribute.
    """
    message = "You can only edit your own personal data."

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        owner_id = getattr(obj, "user_id", None) or getattr(getattr(obj, "user", None), "id", None)
        return owner_id == request.user.id


class IsDoctorAndOwner(_ActiveAuthMixin, BasePermission):
    """The requesting user must be a doctor AND own the object."""
    message = "A doctor can only access their own data."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_doctor(request.user)

    def has_object_permission(self, request, view, obj) -> bool:
        owner_id = getattr(obj, "user_id", None) or getattr(getattr(obj, "user", None), "id", None)
        return owner_id == request.user.id


# ─────────────────────────────────────────────────────────────────────────────
# Clinic permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsClinicOwner(_ActiveAuthMixin, BasePermission):
    """Only the doctor who owns the clinic."""
    message = "Only the clinic owner can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        try:
            return obj.owner.user_id == request.user.id
        except Exception:
            return False


class IsClinicStaffOrOwner(_ActiveAuthMixin, BasePermission):
    """Clinic owner (doctor) or active clinic staff."""
    message = "This operation is available to clinic staff only."

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        # Owner
        try:
            if obj.owner.user_id == user.id:
                return True
        except Exception:
            pass
        # Active staff
        return obj.staff.filter(user=user, is_active=True).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Hospital permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsHospitalStaff(_ActiveAuthMixin, BasePermission):
    """Active staff member of the hospital."""
    message = "This operation is available to hospital staff only."

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.hospital_staff.filter(user=request.user, is_active=True).exists()


class IsHospitalAdminOrStaff(_ActiveAuthMixin, BasePermission):
    """Hospital admin or active staff."""
    message = "This operation is available to admins and hospital staff."

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if request.user.hospital_admin_links.filter(hospital=obj).exists():
            return True
        return obj.hospital_staff.filter(user=user, is_active=True).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Scheduling permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsDoctorOrHospitalAdmin(_ActiveAuthMixin, BasePermission):
    """
    Bug #2 / Bug #3 Fix — Scheduling permissions.
    Allows BOTH doctors (manage own schedules/slots) and hospital admins
    (manage schedules/slots for doctors linked to their hospital).
    Platform admins always pass.
    """
    message = "This operation is available to doctors and hospital admins only."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        u = request.user
        return _is_doctor(u) or _is_hospital_admin(u) or _is_platform_admin(u)


class IsDoctorOwner(_ActiveAuthMixin, BasePermission):
    """
    Doctor who owns the schedule/slot.
    Object must have a .doctor or .doctor_id attribute.
    """
    message = "A doctor can only access their own schedule."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_doctor(request.user)

    def has_object_permission(self, request, view, obj) -> bool:
        doctor_id = getattr(obj, "doctor_id", None)
        if doctor_id:
            return doctor_id == request.user.id
        doctor = getattr(obj, "doctor", None)
        if doctor:
            return getattr(doctor, "user_id", None) == request.user.id
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Search permissions
# ─────────────────────────────────────────────────────────────────────────────

class IsSearchUser(_ActiveAuthMixin, BasePermission):
    """Any authenticated and active user can search."""
    message = "Login required to search."


class IsAdminSearchViewer(_ActiveAuthMixin, BasePermission):
    """Only platform admins can view aggregated search analytics."""
    message = "Search analytics are available to admins only."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and _is_platform_admin(request.user)

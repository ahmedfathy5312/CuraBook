"""
Appointment-specific permission classes.

These are view-level guards for AppointmentViewSet actions.
Object-level enforcement is handled by AppointmentPolicy (core.permissions.policies).
"""

from rest_framework.permissions import BasePermission

# Re-export all core permissions so legacy `from appointments.permissions import X` still works
from core.permissions import *  # noqa: F401, F403


class IsAppointmentParticipant(BasePermission):
    """
    Any authenticated user who can have a stake in an appointment:
    patient, doctor, assistant, or hospital admin.
    Blocks unrelated roles (e.g. platform admin is handled separately).
    """
    message = "You must be a participant of this appointment to access it."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return any([
            getattr(user, 'is_patient', False),
            getattr(user, 'is_doctor', False),
            getattr(user, 'is_assistant', False),
            getattr(user, 'hospital_admin', False),
            getattr(user, 'is_staff', False),
            getattr(user, 'is_platform_admin', False),
        ])


class IsAppointmentManager(BasePermission):
    """
    Users who can confirm, reject, or otherwise manage appointments:
    doctors, assistants, hospital admins, and platform admins.
    Patients cannot manage — they can only book and cancel.
    """
    message = "This permission is available to doctors, assistants, and hospital admins only."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, 'is_assistant', False):
            profile = getattr(user, 'assistant_profile', None)
            if not profile or not profile.effective_permissions().get('manage_appointments', False):
                return False
        return any([
            getattr(user, 'is_doctor', False),
            getattr(user, 'is_assistant', False),
            getattr(user, 'hospital_admin', False),
            getattr(user, 'is_staff', False),
            getattr(user, 'is_platform_admin', False),
        ])


class IsAppointmentDoctor(BasePermission):
    """
    Only doctors (and platform admins) can perform doctor-exclusive actions
    such as marking an appointment as complete.
    """
    message = "This permission is available to doctors only."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return (
            getattr(user, 'is_doctor', False)
            or getattr(user, 'is_staff', False)
            or getattr(user, 'is_platform_admin', False)
        )

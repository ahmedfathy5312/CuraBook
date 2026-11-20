"""
CuraBook — Centralized Permission System
==========================================
Single import point for ALL permission classes.

Usage:
    from core.permissions import IsDoctor, IsPatient, AppointmentPolicy

Role permissions (view-level gates):
    IsAuthenticatedAndActive
    IsDoctor
    IsPatient
    IsAssistant
    IsHospitalAdmin
    IsPlatformAdmin
    IsDoctorOrPatient
    IsDoctorOrReadOnly
    IsDoctorOrHospitalAdmin
    IsHospitalAdminOrDoctorReadOnly
    CanManageDoctors
    CanAccessMedicalData

Ownership permissions (object-level gates):
    IsOwnerOrReadOnly
    IsDoctorAndOwner
    IsClinicOwner
    IsClinicStaffOrOwner
    IsHospitalStaff
    IsHospitalAdminOrStaff
    IsDoctorOwner

Scheduling / Search:
    IsSearchUser
    IsAdminSearchViewer

Policy classes (complex object-level logic — from policies/permissions.py):
    AppointmentPolicy
    ClinicPolicy
    HospitalPolicy
    SchedulePolicy
    UserProfilePolicy
    NotificationPolicy
    ReviewPolicy
    AuditLogPolicy
"""

# ── Role & ownership permissions ─────────────────────────────────────────────
from .role_permissions import (
    IsAuthenticatedAndActive,
    IsDoctor,
    IsPatient,
    IsAssistant,
    IsHospitalAdmin,
    IsPlatformAdmin,
    IsDoctorOrPatient,
    IsDoctorOrReadOnly,
    IsHospitalAdminOrDoctorReadOnly,
    CanManageDoctors,
    CanAccessMedicalData,
    IsOwnerOrReadOnly,
    IsDoctorAndOwner,
    IsClinicOwner,
    IsClinicStaffOrOwner,
    IsHospitalStaff,
    IsHospitalAdminOrStaff,
    IsDoctorOwner,
    IsDoctorOrHospitalAdmin,
    IsSearchUser,
    IsAdminSearchViewer,
)

# ── Policy classes (complex object-level) ────────────────────────────────────
from .policies.permissions import (
    AppointmentPolicy,
    ClinicPolicy,
    HospitalPolicy,
    SchedulePolicy,
    UserProfilePolicy,
    NotificationPolicy,
    ReviewPolicy,
    AuditLogPolicy,
)

__all__ = [
    # Role
    "IsAuthenticatedAndActive",
    "IsDoctor",
    "IsPatient",
    "IsAssistant",
    "IsHospitalAdmin",
    "IsPlatformAdmin",
    "IsDoctorOrPatient",
    "IsDoctorOrReadOnly",
    "IsHospitalAdminOrDoctorReadOnly",
    "CanManageDoctors",
    "CanAccessMedicalData",
    # Ownership
    "IsOwnerOrReadOnly",
    "IsDoctorAndOwner",
    "IsClinicOwner",
    "IsClinicStaffOrOwner",
    "IsHospitalStaff",
    "IsHospitalAdminOrStaff",
    "IsDoctorOwner",
    "IsDoctorOrHospitalAdmin",
    # Search
    "IsSearchUser",
    "IsAdminSearchViewer",
    # Policies
    "AppointmentPolicy",
    "ClinicPolicy",
    "HospitalPolicy",
    "SchedulePolicy",
    "UserProfilePolicy",
    "NotificationPolicy",
    "ReviewPolicy",
    "AuditLogPolicy",
]

"""
CuraBook — Hospital Service Layer
====================================
Business logic for hospital management.
No business logic is allowed in ViewSets — all logic lives here.
"""

import logging
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied

from .models import Hospital, HospitalDoctor, HospitalAssistant, HospitalAdmin, Department

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Hospital CRUD
# ─────────────────────────────────────────────

@transaction.atomic
def create_hospital(name: str, address: str = "", phone: str = "", email: str = "") -> Hospital:
    """Create a new hospital."""
    hospital = Hospital.objects.create(
        name=name,
        address=address,
        phone=phone,
        email=email,
    )
    logger.info(f"[Hospital] Created: {hospital.id} — {hospital.name}")
    return hospital


@transaction.atomic
def update_hospital(hospital: Hospital, **kwargs) -> Hospital:
    """Update hospital fields. Triggers cache invalidation via signal."""
    allowed_fields = {'name', 'address', 'phone', 'email', 'is_active', 'metadata'}
    for field, value in kwargs.items():
        if field in allowed_fields:
            setattr(hospital, field, value)
    hospital.save()
    logger.info(f"[Hospital] Updated: {hospital.id}")
    return hospital


@transaction.atomic
def soft_delete_hospital(hospital: Hospital, actor) -> Hospital:
    """Soft-delete a hospital. Does not cascade to appointments."""
    if not getattr(actor, 'is_platform_admin', False) and not getattr(actor, 'is_staff', False):
        raise PermissionDenied("Only platform admins can delete hospitals.")
    hospital.is_deleted = True
    hospital.is_active  = False
    hospital.save(update_fields=['is_deleted', 'is_active'])
    logger.info(f"[Hospital] Soft-deleted: {hospital.id} by actor={actor.id}")
    return hospital


# ─────────────────────────────────────────────
# Doctor Assignments
# ─────────────────────────────────────────────

@transaction.atomic
def assign_doctor_to_hospital(doctor_user, hospital: Hospital, department: Department = None) -> HospitalDoctor:
    """Link a doctor to a hospital (optionally in a department)."""
    if not getattr(doctor_user, 'is_doctor', False):
        raise ValidationError("Only users with doctor role can be assigned to hospitals.")

    link, created = HospitalDoctor.objects.get_or_create(
        user=doctor_user,
        hospital=hospital,
        defaults={'department': department, 'is_active': True},
    )
    if not created and not link.is_active:
        link.is_active = True
        if department:
            link.department = department
        link.save(update_fields=['is_active', 'department'])

    logger.info(f"[Hospital] Doctor {doctor_user.id} assigned to hospital {hospital.id}")
    return link


@transaction.atomic
def remove_doctor_from_hospital(doctor_user, hospital: Hospital) -> None:
    """Deactivate a doctor's link to a hospital."""
    updated = HospitalDoctor.objects.filter(
        user=doctor_user, hospital=hospital
    ).update(is_active=False)
    if updated:
        logger.info(f"[Hospital] Doctor {doctor_user.id} removed from hospital {hospital.id}")


# ─────────────────────────────────────────────
# Assistant Assignments
# ─────────────────────────────────────────────

@transaction.atomic
def assign_assistant_to_hospital(
    assistant_profile, hospital: Hospital, role: str = 'receptionist'
) -> HospitalAssistant:
    """Link an AssistantProfile to a hospital."""
    link, created = HospitalAssistant.objects.get_or_create(
        assistant=assistant_profile,
        hospital=hospital,
        defaults={'role': role, 'is_active': True},
    )
    if not created and not link.is_active:
        link.is_active = True
        link.role = role
        link.save(update_fields=['is_active', 'role'])

    logger.info(
        f"[Hospital] Assistant {assistant_profile.id} assigned to hospital {hospital.id}"
    )
    return link


@transaction.atomic
def remove_assistant_from_hospital(assistant_profile, hospital: Hospital) -> None:
    """Deactivate an assistant's assignment to a hospital."""
    HospitalAssistant.objects.filter(
        assistant=assistant_profile, hospital=hospital
    ).update(is_active=False)


# ─────────────────────────────────────────────
# Admin Assignments
# ─────────────────────────────────────────────

@transaction.atomic
def assign_admin_to_hospital(user, hospital: Hospital) -> HospitalAdmin:
    """Grant a user hospital admin rights."""
    if not getattr(user, 'hospital_admin', False):
        raise ValidationError(
            "User must have hospital_admin=True before being assigned as admin."
        )
    link, _ = HospitalAdmin.objects.get_or_create(user=user, hospital=hospital)
    logger.info(f"[Hospital] Admin {user.id} assigned to hospital {hospital.id}")
    return link


# ─────────────────────────────────────────────
# Department Management
# ─────────────────────────────────────────────

@transaction.atomic
def create_department(hospital: Hospital, name: str, description: str = "") -> Department:
    """Create a new department in a hospital."""
    if Department.objects.filter(hospital=hospital, name=name).exists():
        raise ValidationError(f"Department '{name}' already exists in {hospital.name}.")
    dept = Department.objects.create(hospital=hospital, name=name, description=description)
    logger.info(f"[Hospital] Department '{name}' created in hospital {hospital.id}")
    return dept

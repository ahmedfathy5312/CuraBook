"""
CuraBook — User Registration Service
======================================
Single entry-point for registering any role:
  patient | doctor | assistant | hospital_admin

Extracted from UserRegisterSerializer.create() — serializers should only
validate data, never orchestrate DB writes.

Flow:
    validate (serializer)  →  register_user (this service)  →  DB
"""

from django.contrib.auth import get_user_model
from django.db import transaction

from users.models import DoctorProfile, PatientProfile, AssistantProfile
from clinics.models import Clinic
from hospital.models import Hospital, HospitalAdmin

User = get_user_model()

VALID_ROLES = frozenset({"doctor", "patient", "assistant", "hospital_admin"})


@transaction.atomic
def register_user(
    *,
    username: str,
    email: str,
    password: str,
    full_name: str = "",
    phone: str = "",
    city: str = "",
    role: str,
    # Doctor extras
    specialty: str = "",
    age: int | None = None,
    clinic_name: str = "",
    # Hospital admin extras
    hospital_name: str = "",
    hospital_address: str = "",
) -> User:
    """
    Create a User + role-specific profile in a single atomic transaction.

    Raises:
        ValueError     — if role is not one of VALID_ROLES
        IntegrityError — if username/email is already taken (propagate to view)

    Returns:
        The newly created User instance.
    """
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Must be one of {sorted(VALID_ROLES)}.")

    # ── 1. Create core user ──────────────────────────────────────────────────
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        full_name=full_name,
        phone=phone or None,   # ✅ FIX: "" → None to avoid unique IntegrityError
        city=city or None,
    )

    # ── 2. Set role flags ────────────────────────────────────────────────────
    # BUG-2 FIX: is_staff must NOT be set for hospital_admin.
    # is_staff=True grants Django admin panel access and causes
    # _is_platform_admin() to return True, which bypasses hospital-scoped
    # permission checks (e.g. hospital admin could access all hospitals' data).
    # hospital_admin flag alone is sufficient for IsDoctorOrHospitalAdmin.
    user.role           = role
    user.is_active      = True
    user.is_doctor      = role == "doctor"
    user.is_patient     = role == "patient"
    user.is_assistant   = role == "assistant"
    user.hospital_admin = role == "hospital_admin"
    user.is_staff       = False  # BUG-2 FIX: never grant Django staff to hospital_admin
    user.save(update_fields=[
        "role", "is_active", "is_doctor", "is_patient",
        "is_assistant", "hospital_admin", "is_staff",
    ])

    # ── 3. Create role-specific profile ──────────────────────────────────────
    if role == "doctor":
        doctor_profile = DoctorProfile.objects.create(
            user=user,
            specialty=specialty,
            age=age,
        )
        if clinic_name:
            Clinic.objects.create(owner=doctor_profile, name=clinic_name)

    elif role == "patient":
        PatientProfile.objects.create(user=user, age=age)

    elif role == "assistant":
        AssistantProfile.objects.create(user=user)

    elif role == "hospital_admin":
        hospital, _ = Hospital.objects.get_or_create(
            name=hospital_name or full_name or username,
            defaults={"address": hospital_address},
        )
        HospitalAdmin.objects.get_or_create(user=user, hospital=hospital)

    return user

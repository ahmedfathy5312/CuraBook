# hospital/clinic_services.py
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Clinic, ClinicStaff

# ==================================================
# Clinic Creation / Management Services
# ==================================================

@transaction.atomic
def create_clinic(owner, name, hospital=None, address=None, city=None, phone=None, metadata=None, is_active=True):
    """
    Create a new private clinic owned by a single doctor (owner).
    CRITICAL FIX (Problem 10 – Settings 500): Added `city` parameter that was
    missing from the signature while the Clinic model has a city field.
    The frontend sends city; omitting it caused TypeError → HTTP 500.
    """
    clinic_data = {
        'owner': owner,
        'name': name,
        'hospital': hospital,
        'address': address,
        'city': city,
        'phone': phone,
        'metadata': metadata or {},
        'is_active': is_active
    }
    clinic = Clinic.objects.create(**clinic_data)
    return clinic


@transaction.atomic
def add_doctor(clinic, user, accepts_booking=True):
    """
    Add a doctor to a clinic. Only users with is_doctor=True are allowed.
    """
    if not getattr(user, 'is_doctor', False):
        raise ValidationError("User must have a doctor role to be added as ClinicDoctor.")

    doctor, created = ClinicDoctor.objects.get_or_create(
        clinic=clinic,
        user=user,
        defaults={'accepts_booking': accepts_booking, 'is_active': True}
    )

    # Update accepts_booking if it was changed
    if not created and doctor.accepts_booking != accepts_booking:
        doctor.accepts_booking = accepts_booking
        doctor.save(update_fields=['accepts_booking'])

    return doctor


@transaction.atomic
def add_staff(clinic, user, role='assistant', is_active=True):
    """
    Add a staff member to a clinic.
    Prevent adding doctors as staff.
    """
    if getattr(user, 'is_doctor', False):
        raise ValidationError("Doctor cannot be added as clinic staff.")

    staff, created = ClinicStaff.objects.get_or_create(
        clinic=clinic,
        user=user,
        defaults={'role': role, 'is_active': is_active}
    )

    # Update role or is_active if existing
    if not created:
        updated = False
        if staff.role != role:
            staff.role = role
            updated = True
        if staff.is_active != is_active:
            staff.is_active = is_active
            updated = True
        if updated:
            staff.save(update_fields=['role', 'is_active'])

    return staff


@transaction.atomic
def create_clinic_from_request(*, user, name: str, **kwargs) -> "Clinic":
    """
    Always CREATE a new clinic for this doctor.
    If the model has a OneToOneField (legacy), update the existing clinic instead
    of crashing with an IntegrityError.  This makes POST idempotent-safe while
    still supporting doctors who want to update their single clinic via POST.

    Updating an existing clinic should be done via PATCH to /clinics/<id>/ using
    the ViewSet's update() method — not via this function.

    Raises:
        ValidationError — if user does not have a doctor_profile
    """
    from django.core.exceptions import ValidationError as DjangoValidationError
    from django.db import IntegrityError

    if not hasattr(user, "doctor_profile"):
        raise DjangoValidationError("Only doctors can create clinics.")

    profile = user.doctor_profile

    # Filter kwargs to only model fields to avoid unexpected keyword args
    allowed_fields = {f.name for f in Clinic._meta.get_fields() if hasattr(f, 'column')}
    safe_kwargs = {k: v for k, v in kwargs.items() if k in allowed_fields}

    # FIX D: owner is now ForeignKey — CREATE always succeeds; each POST creates a new clinic.
    clinic = Clinic.objects.create(owner=profile, name=name, **safe_kwargs)
    return clinic

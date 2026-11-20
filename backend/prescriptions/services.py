"""
CuraBook — Prescriptions Service
==================================
Handles prescription creation and medication management.
Extracted from PrescriptionSerializer.create() / update().

Flow:
    View  →  PrescriptionSerializer (validation)  →  create_prescription() (this service)
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from appointments.models import Appointment
from .models import Prescription, PrescriptionMedication


@transaction.atomic
def create_prescription(
    *,
    doctor,
    patient,
    appointment=None,
    diagnosis: str = "",
    notes: str = "",
    medications_data: list | None = None,
) -> Prescription:
    """
    Create a Prescription with its medications in a single atomic transaction.

    Args:
        doctor          — the prescribing doctor (User)
        patient         — the patient (User)
        appointment     — optional linked Appointment
        diagnosis       — diagnosis text
        notes           — additional notes
        medications_data — list of dicts with medication fields

    Returns:
        Newly created Prescription instance.
    """
    # ── Validate appointment belongs to this doctor and is in a valid state ──────
    # Allow CONFIRMED and COMPLETED appointments — doctors may need to write
    # prescriptions during or after the session.  Only PENDING/CANCELLED/NO_SHOW
    # are rejected to prevent premature prescription issuance.
    if appointment is not None:
        if isinstance(appointment, int):
            try:
                appointment = Appointment.objects.get(id=appointment)
            except Appointment.DoesNotExist:
                raise ValidationError("Appointment not found.")
        ALLOWED_STATUSES = {
            Appointment.Status.CONFIRMED,
            Appointment.Status.COMPLETED,
        }
        if appointment.status not in ALLOWED_STATUSES:
            raise ValidationError(
                f"Cannot write a prescription for a {appointment.status} appointment. "
                "The appointment must be CONFIRMED or COMPLETED."
            )
        if appointment.doctor_id != doctor.id:
            raise PermissionDenied(
                "You are not the assigned doctor for this appointment."
            )

    prescription = Prescription.objects.create(
        doctor=doctor,
        patient=patient,
        appointment=appointment,
        diagnosis=diagnosis,
        notes=notes,
    )

    for med in (medications_data or []):
        PrescriptionMedication.objects.create(
            prescription=prescription,
            **med,
        )

    return prescription


@transaction.atomic
def update_prescription(
    *,
    instance: Prescription,
    medications_data: list | None = None,
    **fields,
) -> Prescription:
    """
    Update a Prescription's fields and replace medications atomically.

    If medications_data is provided, ALL existing medications are replaced
    with the new list (replace-all semantics — simpler and safer than partial patch).

    Args:
        instance         — the Prescription to update
        medications_data — if provided, replaces all existing medications
        **fields         — any Prescription fields to update

    Returns:
        Updated Prescription instance.
    """
    for attr, value in fields.items():
        setattr(instance, attr, value)
    instance.save()

    if medications_data is not None:
        instance.medications.all().delete()
        for med in medications_data:
            PrescriptionMedication.objects.create(
                prescription=instance,
                **med,
            )

    return instance

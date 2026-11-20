"""
CuraBook — Schedule Service
=============================
Manages Schedule availability checks and BlockedSlot operations.

Responsibilities:
  • Check if a date is blocked (TimeOff or BlockedSlot)
  • Create BlockedSlots and deactivate affected GeneratedSlots
"""

from datetime import datetime

from django.db import transaction
from django.db.models import Q

from scheduling.models import TimeOff, BlockedSlot, GeneratedSlot


# ─────────────────────────────────────────────────────────────────────────────
# TimeOff check
# ─────────────────────────────────────────────────────────────────────────────

def is_in_timeoff(doctor, start: datetime, end: datetime) -> bool:
    """Return True if the given slot window overlaps any of the doctor's TimeOffs."""
    return TimeOff.objects.filter(
        doctor=doctor,
        start__lt=end,
        end__gt=start,
    ).exists()


# ─────────────────────────────────────────────────────────────────────────────
# BlockedSlot check
# ─────────────────────────────────────────────────────────────────────────────

def is_date_blocked(
    *,
    slot_date=None,
    doctor=None,
    clinic=None,
    hospital=None,
) -> bool:
    """
    Return True if any BlockedSlot covers slot_date for the given entity.

    At least one of doctor / clinic / hospital must be provided.
    """
    if slot_date is None:
        return False

    if not (doctor or clinic or hospital):
        return False

    conditions = Q()
    if doctor:
        conditions |= Q(doctor=doctor)
    if clinic:
        conditions |= Q(clinic=clinic)
    if hospital:
        conditions |= Q(hospital=hospital)

    return BlockedSlot.objects.filter(
        start_date__lte=slot_date,
        end_date__gte=slot_date,
    ).filter(conditions).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Create BlockedSlot
# ─────────────────────────────────────────────────────────────────────────────

def create_blocked_slot(
    *,
    created_by,
    start_date,
    end_date,
    reason: str = "other",
    note: str = "",
    doctor=None,
    clinic=None,
    hospital=None,
) -> tuple:
    """
    Create a BlockedSlot and immediately deactivate all unbooked
    GeneratedSlots in the date range.

    Returns:
        (BlockedSlot instance, int deactivated_count)
    """
    block = BlockedSlot(
        doctor=doctor,
        clinic=clinic,
        hospital=hospital,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        note=note,
        created_by=created_by,
    )
    block.full_clean()

    with transaction.atomic():
        block.save()
        deactivated = block.deactivate_slots()

    return block, deactivated

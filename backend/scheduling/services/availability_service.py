"""
CuraBook — Availability Service
==================================
Query doctor availability: available slots, booked slots, open days.

Used by:
  • Search API     — "show me free slots for Dr. X next week"
  • Booking API    — "is this slot still available?"
  • Patient UI     — calendar availability view
"""

from datetime import date, timedelta

from django.utils import timezone

from scheduling.models import GeneratedSlot, Schedule


def get_available_slots(
    doctor,
    start_date: date,
    end_date: date,
    clinic=None,
    hospital=None,
) -> list:
    """
    Return all unbooked, active GeneratedSlots for a doctor in the date range.

    Args:
        doctor     — DoctorProfile or User
        start_date — range start (inclusive)
        end_date   — range end (inclusive)
        clinic     — optional location filter
        hospital   — optional location filter

    Returns:
        QuerySet of GeneratedSlot (lazy — not evaluated until iterated).
    """
    qs = GeneratedSlot.objects.select_related(
        "doctor", "clinic", "hospital", "schedule"
    ).filter(
        doctor=doctor,
        is_booked=False,
        is_active=True,
        start__date__gte=start_date,
        start__date__lte=end_date,
    ).order_by("start")

    if clinic:
        qs = qs.filter(clinic=clinic)
    elif hospital:
        qs = qs.filter(hospital=hospital)

    return qs


def get_booked_slots(
    doctor,
    start_date: date,
    end_date: date,
) -> list:
    """Return all booked slots for a doctor in the date range."""
    return GeneratedSlot.objects.filter(
        doctor=doctor,
        is_booked=True,
        start__date__gte=start_date,
        start__date__lte=end_date,
    ).order_by("start")


def get_next_available_date(doctor, from_date: date | None = None) -> date | None:
    """
    Return the date of the next available (unbooked) slot for a doctor.

    Returns None if no available slots exist.
    """
    from_date = from_date or timezone.now().date()

    slot = GeneratedSlot.objects.filter(
        doctor=doctor,
        is_booked=False,
        is_active=True,
        start__date__gte=from_date,
    ).order_by("start").first()

    return slot.start.date() if slot else None


def get_doctor_schedule_summary(doctor) -> dict:
    """
    Return a lightweight summary of the doctor's active schedule days.

    Returns:
        {
            "active_schedules": int,
            "working_days": [str, ...],   # e.g. ["Monday", "Wednesday"]
            "next_available": date | None
        }
    """
    day_names = {0: "Saturday", 1: "Sunday", 2: "Monday", 3: "Tuesday",
                 4: "Wednesday", 5: "Thursday", 6: "Friday"}

    schedules = Schedule.objects.filter(doctor=doctor, is_active=True)
    working_days = sorted(set(day_names[s.day_of_week] for s in schedules))

    return {
        "active_schedules": schedules.count(),
        "working_days":     working_days,
        "next_available":   get_next_available_date(doctor),
    }


def book_slot(slot_id: int):
    """
    Mark a GeneratedSlot as booked.
    Raises ValueError if slot doesn't exist or is already booked/inactive.
    Returns the updated slot.
    """
    from scheduling.models import GeneratedSlot

    try:
        slot = GeneratedSlot.objects.get(pk=slot_id)
    except GeneratedSlot.DoesNotExist:
        raise ValueError(f"Slot {slot_id} does not exist.")

    if not slot.is_active:
        raise ValueError("This slot is no longer available.")

    if slot.is_booked:
        raise ValueError("This slot is already booked.")

    slot.is_booked = True
    slot.save(update_fields=["is_booked"])
    return slot

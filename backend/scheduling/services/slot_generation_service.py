"""
CuraBook — Slot Generation Service
=====================================
Generates GeneratedSlot instances from Schedule objects.

Entry points:
  • generate_slots_from_schedule(schedule, start_date, end_date) — single schedule
  • generate_slots(doctor, start_date, end_date)                 — all doctor schedules

Both are called by Celery periodic task: scheduling.tasks.generate_weekly_slots
"""

from datetime import timedelta, datetime, date

from django.db import IntegrityError, transaction
from django.utils import timezone

from scheduling.models import Schedule, GeneratedSlot
from .schedule_service import is_in_timeoff, is_date_blocked


# Day-of-week mapping:
#   Schedule.day_of_week: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
#   Python weekday():     0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
_SCHEDULE_TO_PYTHON_WEEKDAY = {0: 5, 1: 6, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4}


@transaction.atomic
def generate_slots_from_schedule(
    schedule: Schedule,
    start_date: date,
    end_date: date,
    override_existing: bool = False,
) -> list:
    """
    Generate GeneratedSlot instances for every matching weekday in the date range.

    Algorithm:
      1. Walk every day from start_date to end_date
      2. Skip days that don't match schedule.day_of_week
      3. Skip days covered by BlockedSlot
      4. Slice the day into slots of schedule.slot_duration minutes
      5. Skip slots that overlap doctor TimeOff
      6. get_or_create each slot (idempotent)

    Args:
        schedule         — Schedule instance to generate from
        start_date       — first day to consider (inclusive)
        end_date         — last day to consider (inclusive)
        override_existing — if True, delete existing slots before recreating

    Returns:
        List of newly created GeneratedSlot instances.

    Raises:
        ValueError — if end_date < start_date
    """
    if end_date < start_date:
        raise ValueError("end_date must be >= start_date.")

    target_weekday = _SCHEDULE_TO_PYTHON_WEEKDAY[schedule.day_of_week]
    slots_created  = []
    current        = start_date

    while current <= end_date:
        if current.weekday() == target_weekday:

            if is_date_blocked(
                slot_date=current,
                doctor=schedule.doctor,
                clinic=schedule.clinic,
                hospital=schedule.hospital,
            ):
                current += timedelta(days=1)
                continue

            start_dt = datetime.combine(current, schedule.start_time)
            end_dt   = datetime.combine(current, schedule.end_time)

            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt)
                end_dt   = timezone.make_aware(end_dt)

            slot_start = start_dt
            while slot_start + timedelta(minutes=schedule.slot_duration) <= end_dt:
                slot_end = slot_start + timedelta(minutes=schedule.slot_duration)

                if not is_in_timeoff(schedule.doctor, slot_start, slot_end):
                    slot = (
                        GeneratedSlot.all_objects
                        .filter(doctor=schedule.doctor, start=slot_start, end=slot_end)
                        .first()
                    )

                    if slot:
                        if slot.is_booked:
                            slot_start = slot_end
                            continue

                        updates = []
                        if slot.is_deleted:
                            slot.is_deleted = False
                            slot.deleted_at = None
                            updates.extend(["is_deleted", "deleted_at"])
                        if slot.clinic_id != getattr(schedule.clinic, "id", None):
                            slot.clinic = schedule.clinic
                            updates.append("clinic")
                        if slot.hospital_id != getattr(schedule.hospital, "id", None):
                            slot.hospital = schedule.hospital
                            updates.append("hospital")
                        if slot.schedule_id != schedule.id:
                            slot.schedule = schedule
                            updates.append("schedule")
                        if not slot.is_active or override_existing:
                            slot.is_active = True
                            updates.append("is_active")
                        if updates:
                            slot.save(update_fields=sorted(set(updates)))
                        slots_created.append(slot)
                    else:
                        try:
                            slot = GeneratedSlot.objects.create(
                                doctor=schedule.doctor,
                                start=slot_start,
                                end=slot_end,
                                clinic=schedule.clinic,
                                hospital=schedule.hospital,
                                schedule=schedule,
                                metadata={},
                                is_active=True,
                                is_booked=False,
                            )
                            slots_created.append(slot)
                        except IntegrityError:
                            slot = (
                                GeneratedSlot.all_objects
                                .filter(doctor=schedule.doctor, start=slot_start, end=slot_end)
                                .first()
                            )
                            if slot and not slot.is_booked:
                                slots_created.append(slot)

                slot_start = slot_end

        current += timedelta(days=1)

    return slots_created


@transaction.atomic
def generate_slots(
    doctor,
    start_date: date,
    end_date: date,
    clinic=None,
    hospital=None,
    override_existing: bool = False,
) -> list:
    """
    Generate slots from ALL of a doctor's active Schedules.

    If clinic or hospital is specified, only that location's schedules are used.

    Args:
        doctor           — doctor User or DoctorProfile
        start_date       — range start
        end_date         — range end
        clinic           — optional location filter
        hospital         — optional location filter
        override_existing — passed through to generate_slots_from_schedule

    Returns:
        Flat list of all newly created GeneratedSlot instances.

    Raises:
        ValueError — if no active schedules found
    """
    if end_date < start_date:
        raise ValueError("end_date must be >= start_date.")

    qs = Schedule.objects.filter(doctor=doctor, is_active=True)
    if clinic:
        qs = qs.filter(clinic=clinic)
    elif hospital:
        qs = qs.filter(hospital=hospital)

    if not qs.exists():
        raise ValueError(
            "No active schedules found for this doctor at the specified location."
        )

    all_slots = []
    for schedule in qs:
        slots = generate_slots_from_schedule(
            schedule=schedule,
            start_date=start_date,
            end_date=end_date,
            override_existing=override_existing,
        )
        all_slots.extend(slots)

    return all_slots

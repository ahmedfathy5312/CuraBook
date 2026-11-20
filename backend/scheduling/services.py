from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone


PY_WEEKDAY_TO_SCHEDULE_DAY = {
    5: 0,  # Saturday
    6: 1,  # Sunday
    0: 2,  # Monday
    1: 3,  # Tuesday
    2: 4,  # Wednesday
    3: 5,  # Thursday
    4: 6,  # Friday
}


def generate_slots_from_schedule(schedule, start_date, end_date, override_existing=False):
    from scheduling.models import GeneratedSlot

    available_slots = []
    current = start_date

    while current <= end_date:
        if PY_WEEKDAY_TO_SCHEDULE_DAY.get(current.weekday()) != schedule.day_of_week:
            current += timedelta(days=1)
            continue

        slot_start = timezone.make_aware(
            datetime.combine(current, schedule.start_time),
            timezone.get_current_timezone(),
        )
        day_end = timezone.make_aware(
            datetime.combine(current, schedule.end_time),
            timezone.get_current_timezone(),
        )
        duration = timedelta(minutes=schedule.slot_duration)

        while slot_start + duration <= day_end:
            slot_end = slot_start + duration
            slot = (
                GeneratedSlot.all_objects
                .filter(doctor=schedule.doctor, start=slot_start, end=slot_end)
                .first()
            )

            if slot:
                # Slots are soft-deleted, but the database unique constraint still
                # sees them. Reuse/reactivate unbooked rows instead of creating a
                # duplicate that would fail with IntegrityError.
                if slot.is_booked:
                    slot_start = slot_end
                    continue

                updates = []
                if slot.is_deleted:
                    slot.is_deleted = False
                    slot.deleted_at = None
                    updates.extend(['is_deleted', 'deleted_at'])
                if slot.schedule_id != schedule.id:
                    slot.schedule = schedule
                    updates.append('schedule')
                if slot.clinic_id != getattr(schedule.clinic, 'id', None):
                    slot.clinic = schedule.clinic
                    updates.append('clinic')
                if slot.hospital_id != getattr(schedule.hospital, 'id', None):
                    slot.hospital = schedule.hospital
                    updates.append('hospital')
                if not slot.is_active or override_existing:
                    slot.is_active = True
                    updates.append('is_active')
                if updates:
                    slot.save(update_fields=sorted(set(updates)))
            else:
                try:
                    slot = GeneratedSlot.objects.create(
                        doctor=schedule.doctor,
                        start=slot_start,
                        end=slot_end,
                        clinic=schedule.clinic,
                        hospital=schedule.hospital,
                        schedule=schedule,
                        is_active=True,
                        is_booked=False,
                    )
                except IntegrityError:
                    slot = (
                        GeneratedSlot.all_objects
                        .filter(doctor=schedule.doctor, start=slot_start, end=slot_end)
                        .first()
                    )

            if slot and not slot.is_booked:
                updates = []
                if slot.schedule_id != schedule.id:
                    slot.schedule = schedule
                    updates.append('schedule')
                if slot.clinic_id != getattr(schedule.clinic, 'id', None):
                    slot.clinic = schedule.clinic
                    updates.append('clinic')
                if slot.hospital_id != getattr(schedule.hospital, 'id', None):
                    slot.hospital = schedule.hospital
                    updates.append('hospital')
                if not slot.is_active:
                    slot.is_active = True
                    updates.append('is_active')
                if updates:
                    slot.save(update_fields=updates)
                available_slots.append(slot)

            slot_start = slot_end

        current += timedelta(days=1)

    return available_slots


def generate_slots(doctor, start_date, end_date, clinic=None, hospital=None, override_existing=False):
    from scheduling.models import Schedule

    schedules = Schedule.objects.filter(
        doctor=doctor,
        is_active=True,
    ).select_related('clinic', 'hospital')

    if clinic:
        schedules = schedules.filter(clinic_id=clinic)
    elif hospital:
        schedules = schedules.filter(hospital_id=hospital)

    created_slots = []
    for schedule in schedules:
        created_slots.extend(
            generate_slots_from_schedule(
                schedule=schedule,
                start_date=start_date,
                end_date=end_date,
                override_existing=override_existing,
            )
        )

    return created_slots


def book_slot(slot_id):
    from scheduling.models import GeneratedSlot

    with transaction.atomic():
        slot = (
            GeneratedSlot.objects
            .select_for_update()
            .filter(id=slot_id, is_active=True)
            .first()
        )
        if not slot:
            raise ValidationError("Slot not found.")
        if slot.is_booked:
            raise ValidationError("Slot is already booked.")
        slot.is_booked = True
        slot.save(update_fields=['is_booked'])
        return slot


def create_blocked_slot(*, created_by, start_date, end_date, reason='', note='', doctor=None, clinic=None, hospital=None):
    from scheduling.models import BlockedSlot

    block = BlockedSlot.objects.create(
        created_by=created_by,
        start_date=start_date,
        end_date=end_date,
        reason=reason or 'other',
        note=note or '',
        doctor=doctor,
        clinic=clinic,
        hospital=hospital,
    )
    deactivated = block.deactivate_slots()
    return block, deactivated

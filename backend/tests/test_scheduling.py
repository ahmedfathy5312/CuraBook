"""
CuraBook — Tests: Scheduling Service

Tests slot generation from schedules, timeoffs, and availability.
"""

import pytest
from django.utils import timezone
from datetime import date, timedelta, time

from scheduling.models import Schedule, GeneratedSlot, TimeOff
from scheduling.services import generate_slots_from_schedule
from tests.factories import DoctorProfileFactory, ClinicFactory


@pytest.fixture
def doctor():
    return DoctorProfileFactory().user


@pytest.fixture
def clinic(doctor):
    return ClinicFactory(owner=doctor.doctor_profile)


@pytest.fixture
def monday_schedule(doctor, clinic):
    """A schedule for Monday 09:00–11:00, 30-min slots."""
    return Schedule.objects.create(
        doctor=doctor,
        clinic=clinic,
        day_of_week=2,              # Monday
        start_time=time(9, 0),
        end_time=time(11, 0),
        slot_duration=30,
        is_active=True,
    )


@pytest.mark.django_db
class TestGenerateSlots:

    def _next_monday(self) -> date:
        today = date.today()
        days_ahead = (0 - today.weekday()) % 7   # Monday = 0 in Python
        if days_ahead == 0:
            days_ahead = 7
        return today + timedelta(days=days_ahead)

    def test_generates_correct_count(self, monday_schedule):
        """09:00–11:00 with 30-min slots = 4 slots."""
        monday = self._next_monday()
        slots = generate_slots_from_schedule(
            schedule=monday_schedule,
            start_date=monday,
            end_date=monday,
        )
        assert len(slots) == 4

    def test_slots_linked_to_clinic(self, monday_schedule, clinic):
        monday = self._next_monday()
        slots = generate_slots_from_schedule(
            schedule=monday_schedule,
            start_date=monday,
            end_date=monday,
        )
        assert all(s.clinic_id == clinic.id for s in slots)

    def test_slots_are_unbooked_by_default(self, monday_schedule):
        monday = self._next_monday()
        slots = generate_slots_from_schedule(
            schedule=monday_schedule,
            start_date=monday,
            end_date=monday,
        )
        assert all(not s.is_booked for s in slots)

    def test_skips_slots_overlapping_timeoff(self, doctor, monday_schedule):
        monday = self._next_monday()
        # Block 09:00–10:00 → first 2 slots skipped
        TimeOff.objects.create(
            doctor=doctor,
            start=timezone.make_aware(
                timezone.datetime.combine(monday, time(9, 0))
            ),
            end=timezone.make_aware(
                timezone.datetime.combine(monday, time(10, 0))
            ),
        )

        slots = generate_slots_from_schedule(
            schedule=monday_schedule,
            start_date=monday,
            end_date=monday,
        )
        assert len(slots) == 2     # only 10:00–11:00 (2 slots)

    def test_no_duplicates_on_second_run(self, monday_schedule):
        monday = self._next_monday()
        first  = generate_slots_from_schedule(monday_schedule, monday, monday)
        second = generate_slots_from_schedule(monday_schedule, monday, monday)

        # Second run returns 0 new slots (already exist)
        assert len(second) == 0
        assert GeneratedSlot.objects.filter(
            doctor=monday_schedule.doctor
        ).count() == len(first)

    def test_override_existing_deletes_and_recreates(self, monday_schedule):
        monday = self._next_monday()
        generate_slots_from_schedule(monday_schedule, monday, monday)

        slots = generate_slots_from_schedule(
            monday_schedule, monday, monday, override_existing=True
        )
        assert len(slots) == 4

    def test_raises_if_end_before_start(self, monday_schedule):
        with pytest.raises(ValueError):
            generate_slots_from_schedule(
                schedule=monday_schedule,
                start_date=date.today() + timedelta(days=7),
                end_date=date.today(),
            )

    def test_generates_across_multiple_weeks(self, monday_schedule):
        monday = self._next_monday()
        slots = generate_slots_from_schedule(
            schedule=monday_schedule,
            start_date=monday,
            end_date=monday + timedelta(days=14),   # 3 Mondays
        )
        # 4 slots × 3 weeks = 12
        assert len(slots) == 12

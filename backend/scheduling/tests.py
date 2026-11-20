"""
CuraBook — Scheduling Tests
Uses Schedule model (WorkingHours removed in migration 0003).
"""
import pytest
from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model

from scheduling.models import Schedule, GeneratedSlot, TimeOff, BlockedSlot
from scheduling.services import generate_slots_from_schedule, generate_slots, book_slot

User = get_user_model()


@pytest.mark.django_db
class ScheduleSlotGenerationTest(TestCase):

    def setUp(self):
        self.doctor = User.objects.create_user(
            username='dr_test', email='dr@test.com',
            password='testpass', is_doctor=True, is_active=True,
        )
        # Create a mock clinic
        from clinics.models import Clinic
        self.clinic = Clinic.objects.create(
            doctor=self.doctor,
            name='Test Clinic',
        )

    def test_generate_slots_from_schedule_creates_slots(self):
        """Slots are generated for the correct day of week."""
        # Saturday = day_of_week=0 in our system
        schedule = Schedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=0,  # Saturday
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_duration=30,
        )

        # Pick a Saturday
        start = date(2025, 6, 7)  # Saturday
        end   = date(2025, 6, 7)

        slots = generate_slots_from_schedule(schedule, start, end)

        self.assertEqual(len(slots), 4)  # 9:00, 9:30, 10:00, 10:30
        self.assertEqual(slots[0].clinic, self.clinic)
        self.assertEqual(slots[0].doctor, self.doctor)

    def test_slots_not_generated_on_wrong_day(self):
        """No slots generated for days that don't match the schedule."""
        schedule = Schedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=0,  # Saturday only
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_duration=30,
        )

        # Pick a Sunday
        start = date(2025, 6, 8)  # Sunday
        end   = date(2025, 6, 8)

        slots = generate_slots_from_schedule(schedule, start, end)
        self.assertEqual(len(slots), 0)

    def test_slots_not_generated_during_timeoff(self):
        """Slots that overlap TimeOff are skipped."""
        from django.utils import timezone
        schedule = Schedule.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            day_of_week=0,  # Saturday
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_duration=30,
        )

        target_date = date(2025, 6, 7)  # Saturday
        TimeOff.objects.create(
            doctor=self.doctor,
            start=timezone.make_aware(
                __import__('datetime').datetime.combine(target_date, time(9, 0))
            ),
            end=timezone.make_aware(
                __import__('datetime').datetime.combine(target_date, time(10, 0))
            ),
        )

        slots = generate_slots_from_schedule(schedule, target_date, target_date)
        # Only 10:00 and 10:30 should be generated (9:00 and 9:30 are in TimeOff)
        self.assertEqual(len(slots), 2)

    def test_book_slot_marks_as_booked(self):
        """book_slot correctly marks slot as booked."""
        from django.utils import timezone
        slot = GeneratedSlot.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            start=timezone.now() + timedelta(hours=2),
            end=timezone.now() + timedelta(hours=2, minutes=30),
        )

        booked = book_slot(slot_id=slot.id)
        self.assertTrue(booked.is_booked)

    def test_book_slot_raises_on_already_booked(self):
        """book_slot raises ValidationError if already booked."""
        from django.utils import timezone
        from django.core.exceptions import ValidationError
        slot = GeneratedSlot.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            start=timezone.now() + timedelta(hours=3),
            end=timezone.now() + timedelta(hours=3, minutes=30),
            is_booked=True,
        )

        with self.assertRaises(ValidationError):
            book_slot(slot_id=slot.id)

    def test_blocked_slot_deactivates_existing_slots(self):
        """Creating a BlockedSlot deactivates unbooked slots in that range."""
        from django.utils import timezone
        target_date = date(2025, 7, 5)

        slot = GeneratedSlot.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            start=timezone.make_aware(
                __import__('datetime').datetime.combine(target_date, time(10, 0))
            ),
            end=timezone.make_aware(
                __import__('datetime').datetime.combine(target_date, time(10, 30))
            ),
        )

        block = BlockedSlot.objects.create(
            doctor=self.doctor,
            start_date=target_date,
            end_date=target_date,
        )
        deactivated = block.deactivate_slots()

        slot.refresh_from_db()
        self.assertFalse(slot.is_active)
        self.assertEqual(deactivated, 1)

"""
CuraBook — Scheduling Services Package
========================================
Clean architecture split:

  schedule_service.py       — BlockedSlot + TimeOff checks
  slot_generation_service.py — slot generation from Schedules
  availability_service.py   — query available/booked slots

All public symbols re-exported here for backward compatibility
(existing code using `from scheduling.services import generate_slots` still works).
"""

from .schedule_service import (
    is_in_timeoff,
    is_date_blocked,
    create_blocked_slot,
)

from .slot_generation_service import (
    generate_slots_from_schedule,
    generate_slots,
)

from .availability_service import (
    get_available_slots,
    get_booked_slots,
    get_next_available_date,
    get_doctor_schedule_summary,
    book_slot,
)

__all__ = [
    # schedule_service
    "is_in_timeoff",
    "is_date_blocked",
    "create_blocked_slot",
    # slot_generation_service
    "generate_slots_from_schedule",
    "generate_slots",
    # availability_service
    "get_available_slots",
    "get_booked_slots",
    "get_next_available_date",
    "get_doctor_schedule_summary",
    "book_slot",
]

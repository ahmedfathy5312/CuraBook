"""
CuraBook — Appointment State Machine
======================================
Enforces valid status transitions only.
All illegal transitions raise InvalidStateTransitionException.

Valid transitions:
    PENDING   → CONFIRMED
    PENDING   → REJECTED
    CONFIRMED → COMPLETED
    CONFIRMED → CANCELLED
    CONFIRMED → NO_SHOW
    CONFIRMED → PENDING    (hospital admin revert-to-pending — Bug #7)

Usage:
    AppointmentStateMachine.validate_transition('PENDING', 'CONFIRMED')  # OK
    AppointmentStateMachine.validate_transition('CONFIRMED', 'PENDING')  # raises
"""

from core.exceptions import InvalidStateTransitionException


class AppointmentStateMachine:
    """
    Enforces the appointment lifecycle state machine.
    All status changes MUST go through this class.
    """

    # Define allowed transitions: { from_status: [allowed_to_statuses] }
    TRANSITIONS: dict[str, list[str]] = {
        "PENDING":               ["CONFIRMED", "REJECTED", "CANCELLED"],
        "CONFIRMED":             ["COMPLETED", "CANCELLED", "NO_SHOW", "PENDING"],  # Bug #7: PENDING added for hospital-admin revert
        "REJECTED":              [],   # Terminal
        "CANCELLED":             [],   # Terminal
        "COMPLETED":             [],   # Terminal
        "NO_SHOW":               [],   # Terminal
        "RESCHEDULE_REQUESTED":  ["CONFIRMED", "REJECTED", "CANCELLED"],
    }

    @classmethod
    def validate_transition(cls, from_status: str, to_status: str) -> None:
        """
        Validates that a transition from from_status → to_status is legal.
        Raises InvalidStateTransitionException if not allowed.

        Args:
            from_status: Current appointment status (e.g. 'PENDING')
            to_status:   Target appointment status (e.g. 'CONFIRMED')
        """
        allowed = cls.TRANSITIONS.get(from_status, [])

        if to_status not in allowed:
            raise InvalidStateTransitionException(
                from_status=from_status,
                to_status=to_status,
            )

    @classmethod
    def can_transition(cls, from_status: str, to_status: str) -> bool:
        """Returns True if the transition is allowed (non-raising version)."""
        return to_status in cls.TRANSITIONS.get(from_status, [])

    @classmethod
    def allowed_next_statuses(cls, from_status: str) -> list[str]:
        """Returns the list of valid next statuses from the given status."""
        return cls.TRANSITIONS.get(from_status, [])

    @classmethod
    def is_terminal(cls, status: str) -> bool:
        """Returns True if the status has no further allowed transitions."""
        return not cls.TRANSITIONS.get(status, [])

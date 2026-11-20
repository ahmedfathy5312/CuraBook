"""
CuraBook — Unit Tests: Appointment State Machine
================================================
Tests all valid and invalid transitions in AppointmentStateMachine.
Target coverage: 100% of state_machine.py
"""

import pytest
from core.workflows.state_machine import AppointmentStateMachine
from core.exceptions import InvalidStateTransitionException


class TestAppointmentStateMachine:
    """Tests for AppointmentStateMachine — no DB needed (pure logic)."""

    # ── Valid transitions ─────────────────────────────────────────

    def test_pending_to_confirmed(self):
        AppointmentStateMachine.validate_transition('PENDING', 'CONFIRMED')

    def test_pending_to_rejected(self):
        AppointmentStateMachine.validate_transition('PENDING', 'REJECTED')

    def test_pending_to_cancelled(self):
        AppointmentStateMachine.validate_transition('PENDING', 'CANCELLED')

    def test_confirmed_to_completed(self):
        AppointmentStateMachine.validate_transition('CONFIRMED', 'COMPLETED')

    def test_confirmed_to_cancelled(self):
        AppointmentStateMachine.validate_transition('CONFIRMED', 'CANCELLED')

    # ── Invalid transitions — terminal states ─────────────────────

    def test_rejected_is_terminal(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('REJECTED', 'PENDING')

    def test_cancelled_is_terminal(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('CANCELLED', 'CONFIRMED')

    def test_completed_is_terminal(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('COMPLETED', 'PENDING')

    # ── Invalid backward transitions ──────────────────────────────

    def test_confirmed_to_pending_invalid(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('CONFIRMED', 'PENDING')

    def test_completed_to_confirmed_invalid(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('COMPLETED', 'CONFIRMED')

    def test_rejected_to_confirmed_invalid(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('REJECTED', 'CONFIRMED')

    # ── Unknown status ────────────────────────────────────────────

    def test_unknown_from_status_raises(self):
        with pytest.raises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('UNKNOWN_STATUS', 'CONFIRMED')

    # ── can_transition (non-raising) ─────────────────────────────

    def test_can_transition_returns_true_for_valid(self):
        assert AppointmentStateMachine.can_transition('PENDING', 'CONFIRMED') is True

    def test_can_transition_returns_false_for_invalid(self):
        assert AppointmentStateMachine.can_transition('CONFIRMED', 'PENDING') is False

    def test_can_transition_false_for_terminal(self):
        assert AppointmentStateMachine.can_transition('COMPLETED', 'PENDING') is False

    # ── is_terminal ───────────────────────────────────────────────

    def test_rejected_is_terminal_check(self):
        assert AppointmentStateMachine.is_terminal('REJECTED') is True

    def test_cancelled_is_terminal_check(self):
        assert AppointmentStateMachine.is_terminal('CANCELLED') is True

    def test_completed_is_terminal_check(self):
        assert AppointmentStateMachine.is_terminal('COMPLETED') is True

    def test_pending_is_not_terminal(self):
        assert AppointmentStateMachine.is_terminal('PENDING') is False

    def test_confirmed_is_not_terminal(self):
        assert AppointmentStateMachine.is_terminal('CONFIRMED') is False

    # ── allowed_next_statuses ─────────────────────────────────────

    def test_allowed_from_pending(self):
        allowed = AppointmentStateMachine.allowed_next_statuses('PENDING')
        assert set(allowed) == {'CONFIRMED', 'REJECTED', 'CANCELLED'}

    def test_allowed_from_confirmed(self):
        allowed = AppointmentStateMachine.allowed_next_statuses('CONFIRMED')
        assert set(allowed) == {'COMPLETED', 'CANCELLED'}

    def test_allowed_from_terminal_is_empty(self):
        assert AppointmentStateMachine.allowed_next_statuses('REJECTED') == []
        assert AppointmentStateMachine.allowed_next_statuses('CANCELLED') == []
        assert AppointmentStateMachine.allowed_next_statuses('COMPLETED') == []

    # ── Exception carries correct info ───────────────────────────

    def test_exception_contains_status_info(self):
        with pytest.raises(InvalidStateTransitionException) as exc_info:
            AppointmentStateMachine.validate_transition('COMPLETED', 'PENDING')

        exc = exc_info.value
        assert exc.details['from'] == 'COMPLETED'
        assert exc.details['to'] == 'PENDING'
        assert exc.code == 'INVALID_STATE_TRANSITION'

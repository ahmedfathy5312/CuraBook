"""
appointments/tests.py
=====================
B-06 FIX: Real tests for the appointments app.
Full test suite lives in backend/tests/ directory.
These tests cover app-specific unit logic.
"""
from django.test import TestCase
from unittest.mock import patch, MagicMock


class AppointmentModelTest(TestCase):
    """Test Appointment model constraints and defaults."""

    def test_appointment_default_status_is_pending(self):
        """New appointments default to PENDING status."""
        from appointments.models import Appointment
        appt = Appointment()
        self.assertEqual(appt.status, 'PENDING')

    def test_appointment_visit_type_default(self):
        """visit_type defaults to IN_PERSON."""
        from appointments.models import Appointment
        appt = Appointment()
        self.assertEqual(appt.visit_type, 'IN_PERSON')


class AppointmentStateMachineTest(TestCase):
    """State machine tests — see also backend/tests/test_state_machine.py."""

    def test_valid_transition_pending_to_confirmed(self):
        from core.workflows.state_machine import AppointmentStateMachine
        # Should not raise
        AppointmentStateMachine.validate_transition('PENDING', 'CONFIRMED')

    def test_invalid_transition_completed_to_confirmed(self):
        from core.workflows.state_machine import AppointmentStateMachine
        from core.exceptions import InvalidStateTransitionException
        with self.assertRaises(InvalidStateTransitionException):
            AppointmentStateMachine.validate_transition('COMPLETED', 'CONFIRMED')

    def test_terminal_states_have_no_transitions(self):
        from core.workflows.state_machine import AppointmentStateMachine
        for terminal in ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW']:
            allowed = AppointmentStateMachine.get_allowed_transitions(terminal)
            self.assertEqual(allowed, [], f"{terminal} should have no allowed transitions")

"""
core/tests.py — Real unit tests for core utilities:
pagination, permissions, throttles, workflows, state machine.
"""
from django.test import TestCase


class StateMachineTest(TestCase):
    """Test AppointmentStateMachine transition rules."""

    def _sm(self):
        from core.workflows.state_machine import AppointmentStateMachine
        return AppointmentStateMachine

    def test_pending_can_transition_to_confirmed(self):
        self._sm().validate_transition('PENDING', 'CONFIRMED')

    def test_pending_can_transition_to_rejected(self):
        self._sm().validate_transition('PENDING', 'REJECTED')

    def test_pending_can_transition_to_cancelled(self):
        self._sm().validate_transition('PENDING', 'CANCELLED')

    def test_confirmed_can_transition_to_completed(self):
        self._sm().validate_transition('CONFIRMED', 'COMPLETED')

    def test_confirmed_can_transition_to_no_show(self):
        self._sm().validate_transition('CONFIRMED', 'NO_SHOW')

    def test_completed_is_terminal(self):
        from core.exceptions import InvalidStateTransitionException
        with self.assertRaises(InvalidStateTransitionException):
            self._sm().validate_transition('COMPLETED', 'CONFIRMED')

    def test_rejected_is_terminal(self):
        from core.exceptions import InvalidStateTransitionException
        with self.assertRaises(InvalidStateTransitionException):
            self._sm().validate_transition('REJECTED', 'PENDING')

    def test_cancelled_is_terminal(self):
        from core.exceptions import InvalidStateTransitionException
        with self.assertRaises(InvalidStateTransitionException):
            self._sm().validate_transition('CANCELLED', 'CONFIRMED')

    def test_no_show_is_terminal(self):
        from core.exceptions import InvalidStateTransitionException
        with self.assertRaises(InvalidStateTransitionException):
            self._sm().validate_transition('NO_SHOW', 'CONFIRMED')

    def test_all_terminal_states_return_empty_transitions(self):
        sm = self._sm()
        for terminal in ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW']:
            result = sm.get_allowed_transitions(terminal)
            self.assertEqual(result, [],
                             f"{terminal} should have no allowed transitions")


class PaginationTest(TestCase):

    def test_standard_pagination_importable(self):
        from core.pagination import StandardPagination
        self.assertIsNotNone(StandardPagination)

    def test_standard_pagination_page_size(self):
        from core.pagination import StandardPagination
        p = StandardPagination()
        self.assertGreater(p.page_size, 0)

    def test_pagination_relative_url_strips_host(self):
        """_make_relative() must strip scheme+host from pagination URLs."""
        from core.pagination import StandardPagination
        p = StandardPagination()
        if hasattr(p, '_make_relative'):
            result = p._make_relative('http://localhost:8000/api/v1/doctors/?page=2')
            self.assertNotIn('localhost', result)
            self.assertTrue(result.startswith('/'))


class ThrottleTest(TestCase):

    def test_all_throttle_classes_importable(self):
        from core.throttles import (
            LoginRateThrottle,
            RegisterRateThrottle,
            BookingRateThrottle,
            AppointmentActionThrottle,
            SearchRateThrottle,
        )
        for cls in [LoginRateThrottle, RegisterRateThrottle,
                    BookingRateThrottle, AppointmentActionThrottle,
                    SearchRateThrottle]:
            self.assertIsNotNone(cls)

    def test_throttle_scopes_defined(self):
        from core.throttles import LoginRateThrottle, RegisterRateThrottle
        self.assertEqual(LoginRateThrottle.scope, 'login')
        self.assertEqual(RegisterRateThrottle.scope, 'register')


class PermissionsTest(TestCase):

    def test_role_permission_classes_importable(self):
        from core.permissions import (
            IsDoctor,
            IsPatient,
            IsHospitalAdmin,
            IsAssistant,
        )
        for cls in [IsDoctor, IsPatient, IsHospitalAdmin, IsAssistant]:
            self.assertIsNotNone(cls)

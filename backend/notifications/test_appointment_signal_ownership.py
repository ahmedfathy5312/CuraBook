from types import SimpleNamespace
from unittest.mock import Mock, patch

from appointments.models import Appointment
from appointments.signals import handle_appointment_change


def test_cancelled_appointment_has_one_notification_owner():
    appointment = SimpleNamespace(
        id=4242,
        status=Appointment.Status.CANCELLED,
        _previous_status=Appointment.Status.CONFIRMED,
        doctor_id=10,
        hospital_id=None,
        clinic_id=None,
    )

    with (
        patch('notifications.services.notify_appointment_status') as notify_status,
        patch('appointments.signals._fire_sms'),
        patch('analytics.dashboard_metrics.invalidate_doctor_metrics'),
        patch('analytics.dashboard_metrics.invalidate_platform_metrics'),
    ):
        handle_appointment_change(
            sender=Appointment,
            instance=appointment,
            created=False,
        )

    notify_status.assert_called_once_with(
        appointment,
        Appointment.Status.CANCELLED,
    )


def test_notifications_app_has_no_competing_appointment_receiver():
    import notifications.signals as notification_signals

    assert not hasattr(notification_signals, 'notify_patient_and_hospital')
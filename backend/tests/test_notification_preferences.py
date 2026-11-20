"""
CuraBook — Unit Tests: Notification Preferences
================================================
Tests NotificationPreferences model + its integration with the notification service.
"""

import pytest
from unittest.mock import patch, MagicMock

from notifications.models import Notification, NotificationPreferences
from tests.factories import PatientUserFactory, DoctorProfileFactory


# ─────────────────────────────────────────────────────
# Model Tests
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestNotificationPreferencesModel:

    def test_for_user_creates_defaults_if_missing(self):
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)

        assert prefs is not None
        assert prefs.user == user
        # All channels enabled by default
        assert prefs.email_enabled is True
        assert prefs.push_enabled is True
        assert prefs.in_app_enabled is True

    def test_for_user_idempotent(self):
        """Calling for_user twice returns the same record."""
        user = PatientUserFactory()
        prefs1 = NotificationPreferences.for_user(user)
        prefs2 = NotificationPreferences.for_user(user)
        assert prefs1.id == prefs2.id

    def test_one_per_user(self):
        """OneToOne — creating a second one raises an error."""
        user = PatientUserFactory()
        NotificationPreferences.objects.create(user=user)
        with pytest.raises(Exception):  # IntegrityError
            NotificationPreferences.objects.create(user=user)

    def test_all_event_flags_default_true(self):
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        assert prefs.notify_on_appointment_confirmed is True
        assert prefs.notify_on_appointment_rejected is True
        assert prefs.notify_on_appointment_cancelled is True
        assert prefs.notify_on_appointment_reminder is True
        assert prefs.notify_on_new_review is True

    def test_can_opt_out_email(self):
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        prefs.email_enabled = False
        prefs.save()

        prefs.refresh_from_db()
        assert prefs.email_enabled is False

    def test_can_opt_out_specific_event(self):
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        prefs.notify_on_appointment_reminder = False
        prefs.save()

        prefs.refresh_from_db()
        assert prefs.notify_on_appointment_reminder is False

    def test_str_representation(self):
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        assert user.username in str(prefs)


# ─────────────────────────────────────────────────────
# Service Integration Tests
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestNotificationServiceWithPreferences:

    @patch('notifications.services._push_to_websocket')
    def test_notification_sent_when_in_app_enabled(self, mock_push):
        from notifications.services import send_notification
        user = PatientUserFactory()
        # Default: in_app_enabled=True
        result = send_notification(user, title='Test', body='Hello')
        assert result is not None
        assert Notification.objects.filter(user=user).exists()
        mock_push.assert_called_once()

    @patch('notifications.services._push_to_websocket')
    def test_notification_not_saved_when_in_app_disabled(self, mock_push):
        from notifications.services import send_notification
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        prefs.in_app_enabled = False
        prefs.save()

        result = send_notification(user, title='Test', body='Hello')
        assert result is None
        assert not Notification.objects.filter(user=user).exists()
        mock_push.assert_not_called()

    @patch('notifications.services._push_to_websocket')
    @patch('notifications.tasks.send_notification_email.delay')
    def test_email_not_sent_when_email_disabled(self, mock_email, mock_push):
        from notifications.services import send_notification
        user = PatientUserFactory()
        user.email = 'test@test.com'
        user.save()

        prefs = NotificationPreferences.for_user(user)
        prefs.email_enabled = False
        prefs.save()

        send_notification(
            user, title='Test', body='Hello',
            send_email=True, email_template='confirmed'
        )
        mock_email.assert_not_called()

    @patch('notifications.services._push_to_websocket')
    def test_event_skipped_when_opted_out(self, mock_push):
        from notifications.services import send_notification
        user = PatientUserFactory()
        prefs = NotificationPreferences.for_user(user)
        prefs.notify_on_appointment_reminder = False
        prefs.save()

        result = send_notification(
            user, title='Reminder', body='Your appointment is tomorrow',
            notif_type=Notification.Type.APPOINTMENT_REMINDER
        )
        assert result is None
        mock_push.assert_not_called()

    @patch('notifications.services._push_to_websocket')
    def test_system_notifications_always_sent(self, mock_push):
        """SYSTEM type has no granular preference — always delivered."""
        from notifications.services import send_notification
        user = PatientUserFactory()
        result = send_notification(
            user, title='System', body='Maintenance',
            notif_type=Notification.Type.SYSTEM
        )
        assert result is not None


# ─────────────────────────────────────────────────────
# BaseModel / TimestampedModel Tests
# ─────────────────────────────────────────────────────
@pytest.mark.django_db
class TestBaseModelBehavior:
    """Verify TimestampedModel + SoftDeleteModel fields work correctly."""

    def test_soft_delete_appointment(self):
        from appointments.models import Appointment
        from tests.factories import AppointmentFactory
        appt = AppointmentFactory()
        assert appt.is_deleted is False
        assert appt.deleted_at is None

        appt.delete()  # soft delete
        assert appt.is_deleted is True
        assert appt.deleted_at is not None

        # Should NOT appear in default queryset
        assert not Appointment.objects.filter(id=appt.id).exists()
        # Should appear in all_objects
        assert Appointment.all_objects.filter(id=appt.id).exists()

    def test_restore_appointment(self):
        from tests.factories import AppointmentFactory
        appt = AppointmentFactory()
        appt.delete()
        assert appt.is_deleted is True

        appt.restore()
        assert appt.is_deleted is False
        assert appt.deleted_at is None

    def test_timestamps_auto_populated(self):
        from tests.factories import AppointmentFactory
        appt = AppointmentFactory()
        assert appt.created_at is not None
        assert appt.updated_at is not None

    def test_doctor_profile_soft_delete(self):
        from apps.doctors.models import DoctorProfile
        profile = DoctorProfileFactory()
        profile.delete()
        assert profile.is_deleted is True
        assert not DoctorProfile.objects.filter(id=profile.id).exists()

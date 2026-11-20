"""
CuraBook — SMS Integration Tests  (v31 API-M12 Refactor)
==========================================================
v31 change: Reduced from 728 lines → ~350 lines via:
  - Shared fixtures replacing per-test setup boilerplate
  - @pytest.mark.parametrize for repetitive status/provider cases
  - _make_backend() factory replacing copy-pasted __new__ blocks

Coverage unchanged (10 test categories, all backends, all statuses).
"""

import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from tests.factories import (
    PatientUserFactory, DoctorUserFactory, DoctorProfileFactory,
    PatientProfileFactory, ClinicFactory, SlotFactory, AppointmentFactory,
)

# ─── Shared Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def doctor_profile(db):
    return DoctorProfileFactory()

@pytest.fixture
def clinic(db, doctor_profile):
    return ClinicFactory(owner=doctor_profile, is_active=True)

@pytest.fixture
def slot(db, doctor_profile, clinic):
    return SlotFactory(
        doctor=doctor_profile.user, clinic=clinic,
        start=timezone.now() + timedelta(hours=24),
        end=timezone.now()  + timedelta(hours=24, minutes=30),
    )

@pytest.fixture
def patient_user(db):
    return PatientUserFactory()

@pytest.fixture
def appointment(db, patient_user, doctor_profile, slot, clinic):
    return AppointmentFactory(
        patient=patient_user, doctor=doctor_profile.user,
        slot=slot, clinic=clinic,
    )

def _make_twilio_backend():
    from integrations.sms import TwilioSMSBackend
    b = TwilioSMSBackend.__new__(TwilioSMSBackend)
    b._client = MagicMock()
    b._from   = '+12025551234'
    return b

def _make_vonage_backend():
    from integrations.sms import VonageSMSBackend
    b = VonageSMSBackend.__new__(VonageSMSBackend)
    b._client = MagicMock()
    b._from   = 'CuraBook'
    return b

# ─── 1. ConsoleSMSBackend ─────────────────────────────────────────────────────

class TestConsoleSMSBackend:
    @pytest.mark.parametrize('message', ['Test message', '', 'تم تأكيد موعدك'])
    def test_send_returns_sent_for_any_message(self, message, capsys):
        from integrations.sms import ConsoleSMSBackend
        result = ConsoleSMSBackend().send(to='+201234567890', message=message)
        assert result['status'] == 'sent'
        assert result['provider'] == 'console'

    def test_send_prints_to_stdout(self, capsys):
        from integrations.sms import ConsoleSMSBackend
        ConsoleSMSBackend().send(to='+201234567890', message='Hello world')
        captured = capsys.readouterr()
        assert '+201234567890' in captured.out
        assert 'Hello world' in captured.out

# ─── 2. TwilioSMSBackend ─────────────────────────────────────────────────────

class TestTwilioSMSBackend:
    def test_raises_import_error_without_twilio_package(self):
        import builtins
        real_import = builtins.__import__
        def mock_import(name, *args, **kwargs):
            if name == 'twilio.rest':
                raise ImportError('No module named twilio')
            return real_import(name, *args, **kwargs)
        from integrations.sms import TwilioSMSBackend
        with patch('builtins.__import__', side_effect=mock_import):
            with pytest.raises(ImportError, match='twilio'):
                TwilioSMSBackend()

    def test_raises_env_error_when_credentials_missing(self):
        from integrations.sms import TwilioSMSBackend
        mock_twilio = MagicMock()
        with patch.dict('os.environ', {}, clear=True):
            with patch.dict('sys.modules', {'twilio': mock_twilio, 'twilio.rest': mock_twilio}):
                with pytest.raises(EnvironmentError, match='TWILIO_ACCOUNT_SID'):
                    TwilioSMSBackend()

    def test_send_returns_sent_on_success(self):
        backend = _make_twilio_backend()
        mock_msg = MagicMock()
        mock_msg.sid = 'SM_test_sid_001'
        backend._client.messages.create.return_value = mock_msg
        result = backend.send(to='+201234567890', message='Hello')
        assert result['status'] == 'sent'
        assert result['provider'] == 'twilio'
        assert result['sid'] == 'SM_test_sid_001'

    def test_send_returns_failed_on_exception(self):
        backend = _make_twilio_backend()
        backend._client.messages.create.side_effect = Exception('Network error')
        result = backend.send(to='+201234567890', message='Hello')
        assert result['status'] == 'failed'
        assert 'Network error' in result.get('error', '')

# ─── 3. VonageSMSBackend ─────────────────────────────────────────────────────

class TestVonageSMSBackend:
    def test_raises_import_error_without_vonage_package(self):
        import builtins
        real_import = builtins.__import__
        def mock_import(name, *args, **kwargs):
            if 'vonage' in name:
                raise ImportError('No module named vonage')
            return real_import(name, *args, **kwargs)
        from integrations.sms import VonageSMSBackend
        with patch('builtins.__import__', side_effect=mock_import):
            with pytest.raises(ImportError, match='vonage'):
                VonageSMSBackend()

    @pytest.mark.parametrize('status_code,expected', [(0, 'sent'), (1, 'failed'), (99, 'failed')])
    def test_send_status_based_on_vonage_code(self, status_code, expected):
        backend = _make_vonage_backend()
        backend._client.sms.send_message.return_value = {
            'messages': [{'status': str(status_code), 'message-id': 'VON123'}]
        }
        result = backend.send(to='+201234567890', message='Hello')
        assert result['status'] == expected

    def test_send_strips_plus_from_number(self):
        backend = _make_vonage_backend()
        backend._client.sms.send_message.return_value = {
            'messages': [{'status': '0', 'message-id': 'VON123'}]
        }
        backend.send(to='+201234567890', message='Hello')
        call_kwargs = backend._client.sms.send_message.call_args[0][0]
        assert call_kwargs['to'] == '201234567890'

    def test_send_returns_failed_on_exception(self):
        backend = _make_vonage_backend()
        backend._client.sms.send_message.side_effect = Exception('Vonage down')
        result = backend.send(to='+201234567890', message='Hello')
        assert result['status'] == 'failed'

# ─── 4. get_sms_backend() Factory ────────────────────────────────────────────

class TestGetSmsBackendFactory:
    @pytest.mark.parametrize('provider', [None, 'console', 'CONSOLE', 'unknown'])
    def test_factory_returns_console_as_safe_default(self, provider):
        from integrations.sms import get_sms_backend
        env = {'SMS_PROVIDER': provider} if provider else {}
        with patch.dict('os.environ', env, clear=(provider is None)):
            backend = get_sms_backend()
        assert type(backend).__name__ == 'ConsoleSMSBackend'

# ─── 5. send_sms_notification Task ───────────────────────────────────────────

class TestSendSmsNotificationTask:
    @pytest.fixture(autouse=True)
    def mock_backend(self):
        with patch('integrations.tasks.get_sms_backend') as m:
            m.return_value = MagicMock()
            yield m

    @pytest.mark.parametrize('phone', ['', None])
    def test_skips_empty_or_none_phone(self, phone, mock_backend):
        from integrations.tasks import send_sms_notification
        send_sms_notification(to=phone, message='Hello')
        mock_backend.return_value.send.assert_not_called()

    def test_calls_backend_send_with_correct_args(self, mock_backend):
        from integrations.tasks import send_sms_notification
        send_sms_notification(to='+201234567890', message='Appointment confirmed')
        mock_backend.return_value.send.assert_called_once_with(
            to='+201234567890', message='Appointment confirmed'
        )

# ─── 6. send_appointment_sms_reminder Task ───────────────────────────────────

@pytest.mark.django_db
class TestSendAppointmentSmsReminderTask:
    @pytest.fixture(autouse=True)
    def mock_send_sms(self):
        with patch('integrations.tasks.send_sms_notification.delay') as m:
            yield m

    def test_queues_sms_for_valid_appointment(self, mock_send_sms, appointment):
        from integrations.tasks import send_appointment_sms_reminder
        send_appointment_sms_reminder(appointment_id=appointment.id, window_label='24h')
        mock_send_sms.assert_called_once()

    def test_skips_appointment_without_phone(self, mock_send_sms, appointment):
        appointment.patient.phone = None
        appointment.patient.save()
        from integrations.tasks import send_appointment_sms_reminder
        send_appointment_sms_reminder(appointment_id=appointment.id, window_label='24h')
        mock_send_sms.assert_not_called()

    def test_skips_nonexistent_appointment(self, mock_send_sms):
        from integrations.tasks import send_appointment_sms_reminder
        send_appointment_sms_reminder(appointment_id=99999, window_label='24h')
        mock_send_sms.assert_not_called()

    @pytest.mark.parametrize('window_label', ['1h', '24h', '48h'])
    def test_accepts_all_window_labels(self, window_label, mock_send_sms, appointment):
        from integrations.tasks import send_appointment_sms_reminder
        send_appointment_sms_reminder(appointment_id=appointment.id, window_label=window_label)
        # Just verifying it doesn't raise

# ─── 7. send_sms_reminders_24h Task ──────────────────────────────────────────

@pytest.mark.django_db
class TestSendSmsReminders24hTask:
    @pytest.fixture(autouse=True)
    def mocks(self):
        with patch('integrations.tasks.get_upcoming_appointments_for_sms') as sel, \
             patch('integrations.tasks.send_appointment_sms_reminder.delay') as rem:
            yield sel, rem

    def test_queues_reminder_for_each_upcoming_appointment(self, mocks):
        sel, rem = mocks
        sel.return_value = [MagicMock(id=1), MagicMock(id=2)]
        from integrations.tasks import send_sms_reminders_24h
        send_sms_reminders_24h()
        assert rem.call_count == 2

    def test_handles_empty_list(self, mocks):
        sel, rem = mocks
        sel.return_value = []
        from integrations.tasks import send_sms_reminders_24h
        send_sms_reminders_24h()
        rem.assert_not_called()

    def test_continues_after_individual_failure(self, mocks):
        sel, rem = mocks
        sel.return_value = [MagicMock(id=i) for i in range(3)]
        rem.side_effect = [Exception('Queue full'), None, None]
        from integrations.tasks import send_sms_reminders_24h
        send_sms_reminders_24h()  # must not raise
        assert rem.call_count == 3

# ─── 8. Appointment Signal → SMS ─────────────────────────────────────────────

@pytest.mark.django_db
class TestAppointmentSignalSmsFiring:
    @pytest.fixture(autouse=True)
    def signal_mocks(self):
        with patch('appointments.signals.send_sms_notification.delay') as mock_sms, \
             patch('appointments.signals.notify_user'), \
             patch('appointments.signals.send_mail', side_effect=Exception('no mail')):
            yield mock_sms

    @pytest.mark.parametrize('transition', ['new_booking', 'confirm', 'reject', 'cancel'])
    def test_sms_fired_on_status_transition(self, transition, signal_mocks, appointment):
        from appointments.signals import appointment_status_changed
        appointment_status_changed(sender=None, instance=appointment, transition=transition)
        assert signal_mocks.call_count >= 1

    def test_no_sms_on_complete(self, signal_mocks, appointment):
        from appointments.signals import appointment_status_changed
        appointment_status_changed(sender=None, instance=appointment, transition='complete')
        signal_mocks.assert_not_called()

# ─── 9. SMS Skipped When No Phone ────────────────────────────────────────────

@pytest.mark.django_db
class TestSmsSkippedWithNoPhone:
    @pytest.fixture(autouse=True)
    def signal_mocks(self):
        with patch('appointments.signals.send_sms_notification.delay') as m, \
             patch('appointments.signals.notify_user'):
            yield m

    @pytest.mark.parametrize('phone_value', [None, '', '   '])
    def test_no_sms_when_patient_phone_is_blank(self, phone_value, signal_mocks, appointment):
        appointment.patient.phone = phone_value
        appointment.patient.save()
        from appointments.signals import appointment_status_changed
        appointment_status_changed(sender=None, instance=appointment, transition='confirm')
        signal_mocks.assert_not_called()

# ─── 10. SMS Message Content ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestSmsMessageContent:
    @pytest.fixture
    def build_message(self, appointment):
        def _build(template_key):
            from appointments.signals import _build_sms_message
            return _build_sms_message(template_key, appointment), appointment
        return _build

    @pytest.mark.parametrize('template_key,required_fragments', [
        ('CONFIRMED', ['CuraBook']),
        ('REJECTED',  ['رفض', 'نأسف']),
        ('CANCELLED', ['إلغاء', 'تم إلغاء']),
        ('NEW',       ['CuraBook', 'حجز']),
    ])
    def test_message_contains_required_fragments(self, template_key, required_fragments, build_message):
        message, _ = build_message(template_key)
        assert any(f in message for f in required_fragments), (
            f"Message for {template_key!r} missing all of {required_fragments!r}. Got: {message!r}"
        )

    def test_confirmed_message_contains_slot_date(self, build_message):
        message, appt = build_message('CONFIRMED')
        slot_date = appt.slot.start.strftime('%d/%m/%Y')
        assert slot_date in message

    def test_message_does_not_crash_on_missing_slot(self, appointment):
        from appointments.signals import _build_sms_message
        appointment.slot = None
        result = _build_sms_message('CONFIRMED', appointment)
        assert isinstance(result, str)
        assert '—' in result

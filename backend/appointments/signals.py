"""
CuraBook — Appointment Signals
================================
Fires on every Appointment save:
  1. Real-time WebSocket notification (notify_new_appointment / notify_appointment_status)
  2. Email notification on confirm / reject  (send_appointment_email Celery task)
  3. SMS notification on new booking, confirm, reject, cancel (send_sms_notification Celery task)
  4. Dashboard metrics cache invalidation (doctor + hospital + clinic + platform)

SMS is provider-agnostic: set SMS_PROVIDER=twilio|vonage|console in .env.
ConsoleSMSBackend is the safe default — no credentials needed for dev/test.
"""

import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Appointment

logger = logging.getLogger('curabook')

# SMS trigger statuses: which status transitions fire an SMS to the patient
_SMS_TRIGGER_STATUSES = {
    Appointment.Status.CONFIRMED,
    Appointment.Status.REJECTED,
    Appointment.Status.CANCELLED,
}

# F-06 FIX: Converted all Arabic SMS templates to English for backend consistency
_SMS_TEMPLATES = {
    'CONFIRMED': (
        'Your CuraBook appointment with Dr. {doctor} '
        'on {slot_time} at {location} is confirmed. '
        'Appointment #: {appt_id}'
    ),
    'REJECTED': (
        'We\'re sorry, your CuraBook appointment with Dr. {doctor} '
        'on {slot_time} has been rejected. '
        'You can book another appointment through the app.'
    ),
    'CANCELLED': (
        'Your CuraBook appointment with Dr. {doctor} '
        'on {slot_time} has been cancelled. '
        'Appointment #: {appt_id}'
    ),
    'NEW': (
        'Your CuraBook booking request with Dr. {doctor} '
        'on {slot_time} at {location} has been received. '
        'Appointment #: {appt_id} — pending confirmation.'
    ),
}


def _build_sms_message(template_key: str, appointment: Appointment) -> str:
    """Build a localised SMS message string for the given appointment."""
    try:
        slot_time   = appointment.slot.start.strftime('%d/%m/%Y at %H:%M') if appointment.slot else '—'
        doctor_name = (
            getattr(appointment.doctor, 'full_name', None)
            or getattr(appointment.doctor, 'username', 'the doctor')
        )
        location    = str(appointment.clinic or appointment.hospital or '—')
        template    = _SMS_TEMPLATES.get(template_key, '')
        return template.format(
            doctor=doctor_name,
            slot_time=slot_time,
            location=location,
            appt_id=appointment.id,
        )
    except Exception as exc:
        logger.warning(f'[Signal:SMS] Failed to build SMS message for #{appointment.id}: {exc}')
        return ''


def _get_patient_phone(appointment: Appointment):
    """Safely resolve the patient's phone number from the appointment."""
    try:
        patient_user = getattr(appointment.patient, 'user', None) or appointment.patient
        return (
            getattr(patient_user, 'phone', None)
            or getattr(patient_user, 'phone_number', None)
        )
    except Exception:
        return None


def _fire_sms(template_key: str, appointment: Appointment) -> None:
    """
    Queue an SMS Celery task for the appointment's patient.
    Silently skips if the patient has no phone number.
    Never raises — SMS failures must not block the signal chain.
    """
    try:
        phone = _get_patient_phone(appointment)
        if not phone:
            logger.debug(
                f'[Signal:SMS] Skipping SMS for appointment #{appointment.id} — patient has no phone'
            )
            return

        message = _build_sms_message(template_key, appointment)
        if not message:
            return

        from integrations.tasks import send_sms_notification
        send_sms_notification.delay(phone_number=str(phone), message=message)
        logger.info(f'[Signal:SMS] Queued {template_key} SMS for appointment #{appointment.id} → {phone}')
    except Exception as exc:
        # SMS is non-critical — log and continue
        logger.error(f'[Signal:SMS] Failed to queue SMS for appointment #{appointment.id}: {exc}')


@receiver(pre_save, sender=Appointment)
def capture_previous_appointment_status(sender, instance: Appointment, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        instance._previous_status = (
            Appointment.objects
            .filter(pk=instance.pk)
            .values_list('status', flat=True)
            .first()
        )
    except Exception:
        instance._previous_status = None


@receiver(post_save, sender=Appointment)
def handle_appointment_change(sender, instance: Appointment, created: bool, **kwargs):
    """
    On every appointment save:
      1. Fire real-time WebSocket notification
      2. Send email on confirm / reject
      3. Send SMS on new booking / confirm / reject / cancel
      4. Invalidate dashboard metrics cache (doctor + hospital + clinic + platform)
    """
    from notifications.services import notify_new_appointment, notify_appointment_status

    # ── 1. Real-time + email notifications ──────────────────────────────────
    try:
        if created and instance.status == Appointment.Status.PENDING:
            notify_new_appointment(instance)
            # SMS: inform patient their booking request was received
            _fire_sms('NEW', instance)
        else:
            appt_status = instance.status
            previous_status = getattr(instance, '_previous_status', None)
            if previous_status != appt_status and appt_status in (
                Appointment.Status.CONFIRMED,
                Appointment.Status.REJECTED,
                Appointment.Status.CANCELLED,
                Appointment.Status.COMPLETED,
            ):
                notify_appointment_status(instance, appt_status)

                # Email: confirm + reject only (matching previous behaviour)
                if appt_status in (Appointment.Status.CONFIRMED, Appointment.Status.REJECTED):
                    from appointments.tasks import send_appointment_email
                    send_appointment_email.delay(
                        appointment_id=instance.id,
                        template=appt_status.lower(),
                    )

                # SMS: confirm + reject + cancel
                if appt_status in _SMS_TRIGGER_STATUSES:
                    _fire_sms(appt_status.value if hasattr(appt_status, 'value') else str(appt_status), instance)
    except Exception as e:
        logger.error(f'[Signal] Notification failed for appointment #{instance.id}: {e}')

    # ✅ FIX: Invalidate dashboard caches so counts stay fresh
    try:
        from analytics.dashboard_metrics import (
            invalidate_doctor_metrics,
            invalidate_hospital_metrics,
            invalidate_platform_metrics,
        )
        invalidate_doctor_metrics(instance.doctor_id)
        if instance.hospital_id:
            invalidate_hospital_metrics(instance.hospital_id)
        invalidate_platform_metrics()
        # ✅ Also invalidate clinic metrics if appointment is clinic-based
        if instance.clinic_id:
            from analytics.dashboard_metrics import invalidate_clinic_metrics
            invalidate_clinic_metrics(instance.clinic_id)
    except Exception as e:
        logger.error(f'[Signal] Dashboard cache invalidation failed for #{instance.id}: {e}')

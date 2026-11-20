"""
CuraBook — Integrations Celery Tasks
======================================
SMS appointment reminders wired to the Celery task queue.

These tasks are triggered from:
  - appointments/tasks.py  → send_appointment_reminders()
  - appointments/signals.py → on confirm/reject/cancel events
  - Celery Beat schedule   → send_sms_reminders_24h (daily)

All SMS tasks use the sms_backend singleton from integrations.sms,
so swapping providers (Twilio ↔ Vonage ↔ Console) requires only
changing the SMS_PROVIDER env var.
"""

import logging
from celery import shared_task

logger = logging.getLogger('curabook')

TRANSIENT_ERRORS = (ConnectionRefusedError, TimeoutError, OSError)


@shared_task(
    name='integrations.tasks.send_sms_notification',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=60,
    retry_jitter=True,
    acks_late=True,
)
def send_sms_notification(self, phone_number: str, message: str) -> dict:
    """
    Send a single SMS notification.

    Args:
        phone_number: E.164 format (e.g. '+201234567890')
        message:      Plain text message body
    """
    if not phone_number:
        logger.warning('[SMS Task] No phone number provided — skipping')
        return {'status': 'skipped', 'reason': 'no_phone'}

    try:
        from integrations.sms import sms_backend
        result = sms_backend.send(to=phone_number, message=message)
        logger.info(f'[SMS Task] Result: {result}')
        return result
    except Exception as exc:
        logger.error(f'[SMS Task] Failed to send SMS to {phone_number}: {exc}')
        raise self.retry(exc=exc)


@shared_task(
    name='integrations.tasks.send_appointment_sms_reminder',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=120,
    retry_jitter=True,
    acks_late=True,
)
def send_appointment_sms_reminder(self, appointment_id: int, hours_before: int = 24) -> dict:
    """
    Send an SMS reminder for a specific appointment.

    Args:
        appointment_id: The appointment PK
        hours_before:   How many hours before the appointment (for the message text)
    """
    try:
        from appointments.models import Appointment
        appt = Appointment.objects.select_related(
            'patient__user', 'doctor', 'slot', 'clinic', 'hospital'
        ).get(pk=appointment_id)
    except Appointment.DoesNotExist:
        logger.warning(f'[SMS Reminder] Appointment #{appointment_id} not found')
        return {'status': 'skipped', 'reason': 'appointment_not_found'}

    # Get patient phone
    patient_user = getattr(appt.patient, 'user', None) or appt.patient
    phone = getattr(patient_user, 'phone', None) or getattr(patient_user, 'phone_number', None)

    if not phone:
        logger.info(f'[SMS Reminder] Patient #{patient_user.id} has no phone — skipping')
        return {'status': 'skipped', 'reason': 'no_phone'}

    # Build message
    slot_time   = appt.slot.start.strftime('%d/%m/%Y at %H:%M') if appt.slot else '—'
    doctor_name = getattr(appt.doctor, 'full_name', None) or getattr(appt.doctor, 'username', 'your doctor')
    location    = str(appt.clinic or appt.hospital or '—')

    if hours_before >= 24:
        time_label = 'tomorrow'
    elif hours_before >= 1:
        time_label = f'in {hours_before} hour(s)'
    else:
        time_label = 'soon'

    message = (
        f'CuraBook Reminder: Your appointment with Dr. {doctor_name} '
        f'is {time_label} on {slot_time} '
        f'at {location}. '
        f'Appointment ID: #{appt.id}'
    )

    return send_sms_notification.delay(phone_number=str(phone), message=message)


@shared_task(
    name='integrations.tasks.send_sms_reminders_24h',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=300,
    retry_jitter=True,
    acks_late=True,
)
def send_sms_reminders_24h(self) -> dict:
    """
    Periodic task — runs every 30 min via Celery Beat.
    Sends 24h SMS reminders for upcoming CONFIRMED appointments.
    Complements email reminders in appointments/tasks.py.
    """
    from appointments.selectors import get_appointments_due_for_reminder

    upcoming = list(get_appointments_due_for_reminder())
    queued = 0
    for appt in upcoming:
        try:
            send_appointment_sms_reminder.delay(
                appointment_id=appt.id,
                hours_before=24,
            )
            queued += 1
        except Exception as e:
            logger.error(f'[SMS 24h] Failed to queue reminder for appt #{appt.id}: {e}')

    logger.info(f'[SMS 24h] Queued {queued}/{len(upcoming)} SMS reminders')
    return {'queued': queued}

"""
CuraBook — Notification Celery Tasks (HARDENED)
================================================
Improvements:
  1. autoretry_for + retry_backoff + retry_jitter
  2. HTML email templates
  3. Bulk notification batching
  4. Graceful failure isolation
"""

import logging
from typing import List, Dict

from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger("curabook")

MAX_RETRIES   = 5
RETRY_BACKOFF = 60
RETRY_JITTER  = True
TRANSIENT_ERRORS = (ConnectionRefusedError, TimeoutError, OSError)


@shared_task(
    name="notifications.tasks.send_notification_email",
    bind=True,
    max_retries=MAX_RETRIES,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=RETRY_BACKOFF,
    retry_jitter=RETRY_JITTER,
    acks_late=True,
)
def send_notification_email(self, user_id: int, title: str, body: str, template_context: dict = None):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        logger.error(f"[Email] User #{user_id} not found")
        return {"status": "skipped"}
    if not user.email:
        return {"status": "skipped"}
    subject = f"{title} — CuraBook"
    html_body = None
    if template_context:
        try:
            ctx = {"title": title, "user_name": user.full_name or user.username, **template_context}
            html_body = render_to_string("email/appointment_notification.html", ctx)
        except Exception as e:
            logger.warning(f"[Email] Template render failed: {e}")
    plain_body = strip_tags(html_body) if html_body else body
    try:
        msg = EmailMultiAlternatives(subject=subject, body=plain_body, from_email=settings.DEFAULT_FROM_EMAIL, to=[user.email])
        if html_body:
            msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"[Email] Sent to {user.email}")
        return {"status": "sent", "to": user.email}
    except Exception as exc:
        logger.error(f"[Email] Failed: {exc}")
        raise self.retry(exc=exc, countdown=RETRY_BACKOFF)


@shared_task(
    name="notifications.tasks.send_bulk_notifications",
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=30,
    retry_jitter=True,
    acks_late=True,
)
def send_bulk_notifications(self, notifications: List[Dict]):
    sent = skipped = failed = 0
    for notif in notifications:
        try:
            result = send_notification_email.apply(
                args=[notif["user_id"], notif["title"], notif.get("body", "")],
                kwargs={"template_context": notif.get("template_context")},
            )
            status = result.result.get("status") if result.result else "unknown"
            if status == "sent": sent += 1
            else: skipped += 1
        except Exception as e:
            failed += 1
            logger.error(f"[BulkEmail] Failed for user_id={notif.get("user_id")}: {e}")
    summary = {"sent": sent, "skipped": skipped, "failed": failed}
    logger.info(f"[BulkEmail] Done: {summary}")
    return summary


# NOTE: expire_pending_appointments lives in appointments/tasks.py
#       to keep task ownership clear (appointment logic = appointments app).


@shared_task(
    name='notifications.tasks.send_appointment_reminders',
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def send_appointment_reminders(self):
    """
    Celery Beat task — runs every 15 minutes.
    Sends APPOINTMENT_REMINDER notifications for appointments starting in ~24h.

    Frontend uses the APPOINTMENT_REMINDER WebSocket event to:
    - Show a toast to the patient
    - Badge the notification bell
    """
    import logging
    from django.utils import timezone
    from datetime import timedelta

    logger = logging.getLogger('curabook.notifications')

    try:
        from appointments.models import Appointment
        from notifications.services import send_notification
        from notifications.models import Notification

        now         = timezone.now()
        window_from = now + timedelta(hours=23)
        window_to   = now + timedelta(hours=25)

        # Find CONFIRMED appointments starting in ~24h that haven't had a reminder yet
        upcoming = Appointment.objects.filter(
            status=Appointment.Status.CONFIRMED,
            slot__start__gte=window_from,
            slot__start__lte=window_to,
        ).select_related('patient', 'doctor', 'slot', 'clinic', 'hospital')

        count = 0
        for appt in upcoming:
            # Avoid duplicate reminders
            already_sent = Notification.objects.filter(
                user=appt.patient,
                type=Notification.Type.APPOINTMENT_REMINDER,
                metadata__appointment_id=appt.id,
            ).exists()

            if already_sent:
                continue

            loc_name    = getattr(appt.get_location(), 'name', '')
            doctor_name = appt.doctor.full_name or appt.doctor.username

            send_notification(
                user=appt.patient,
                title='Appointment Reminder for Tomorrow',
                body=f'You have an appointment tomorrow with Dr. {doctor_name} at {loc_name} at {appt.slot.start.strftime("%H:%M")}.',
                notif_type=Notification.Type.APPOINTMENT_REMINDER,
                metadata={
                    'appointment_id': appt.id,
                    'doctor_name':    doctor_name,
                    'slot_start':     appt.slot.start.isoformat(),
                    'location':       loc_name,
                },
                send_email=True,
                email_template='reminder',
            )
            count += 1

        logger.info(f'[Reminders] Sent {count} appointment reminders.')
        return {'sent': count}

    except Exception as exc:
        logger.error(f'[Reminders] Task failed: {exc}', exc_info=True)
        raise self.retry(exc=exc)

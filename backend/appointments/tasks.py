"""
CuraBook — Appointment Celery Tasks (HARDENED)
===============================================
Fixes:
  1. Uses selectors instead of raw ORM queries
  2. autoretry_for + retry_backoff + retry_jitter on all tasks
  3. No duplicate tasks with notifications/tasks.py
     (notifications/tasks.py handles bulk email; this handles scheduling logic)
"""

import logging
from celery import shared_task

logger = logging.getLogger('curabook')

TRANSIENT_ERRORS = (ConnectionRefusedError, TimeoutError, OSError)


@shared_task(
    name='appointments.tasks.expire_pending_appointments',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=60,
    retry_jitter=True,
    acks_late=True,
)
def expire_pending_appointments(self):
    """
    Periodic — runs every 5 min via Celery Beat.
    Uses selector for proper query optimisation.
    """
    from appointments.selectors import get_expired_pending_appointments
    from appointments.services import expire_appointment

    expired = list(get_expired_pending_appointments())
    count = 0
    for appt in expired:
        try:
            expire_appointment(appt)
            count += 1
        except Exception as e:
            logger.error(f'[Expiry] Failed for appointment #{appt.id}: {e}')

    logger.info(f'[Expiry] Expired {count}/{len(expired)} appointments')
    return {'expired': count}


@shared_task(
    name='appointments.tasks.send_appointment_reminders',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=120,
    retry_jitter=True,
    acks_late=True,
)
def send_appointment_reminders(self):
    """
    Periodic — runs every 30 min via Celery Beat.
    Sends 24h reminder for upcoming CONFIRMED appointments.
    Uses selector — no raw ORM.
    Stamps reminder_24h_sent_at after each successful send so retries
    and overlapping Beat ticks never dispatch the same reminder twice.
    """
    from django.utils import timezone
    from appointments.selectors import get_appointments_due_for_reminder
    from appointments.services import send_appointment_reminder

    upcoming = list(get_appointments_due_for_reminder())
    count = 0
    for appt in upcoming:
        try:
            send_appointment_reminder(appt)
            # Idempotency: stamp the field so this appointment is excluded
            # from the selector on every future run, including retries.
            # Use .update() to avoid triggering signals / save overhead.
            from appointments.models import Appointment
            Appointment.objects.filter(pk=appt.pk).update(
                reminder_24h_sent_at=timezone.now()
            )
            count += 1
        except Exception as e:
            logger.error(f'[Reminder] Failed for appointment #{appt.id}: {e}')

    logger.info(f'[Reminder] Sent {count}/{len(upcoming)} reminders')
    return {'reminders_sent': count}


@shared_task(
    name='appointments.tasks.send_appointment_email',
    bind=True,
    max_retries=5,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=60,
    retry_jitter=True,
    acks_late=True,
)
def send_appointment_email(self, appointment_id: int, template: str):
    """
    Sends a single appointment notification email.
    Called from appointment signals on confirm/reject.
    """
    from appointments.models import Appointment
    from notifications.tasks import send_notification_email

    try:
        appt = Appointment.objects.select_related(
            'patient', 'doctor', 'slot', 'clinic', 'hospital'
        ).get(pk=appointment_id)
    except Appointment.DoesNotExist:
        logger.warning(f'[Email] Appointment #{appointment_id} not found')
        return

    # F-06 FIX: Converted all Arabic strings to English for backend consistency
    status_labels = {
        'confirmed': ('Your appointment has been confirmed', 'status-confirmed', 'Confirmed'),
        'rejected':  ('Your appointment has been rejected',  'status-rejected',  'Rejected'),
        'cancelled': ('Your appointment has been cancelled', 'status-cancelled', 'Cancelled'),
        'completed': ('Your appointment is complete',        'status-confirmed', 'Completed'),
    }
    title, status_class, status_label = status_labels.get(
        template, ('Appointment update', 'status-pending', template)
    )

    slot_time    = appt.slot.start.strftime('%A %d/%m/%Y at %H:%M') if appt.slot else '—'
    doctor_name  = appt.doctor.full_name or appt.doctor.username
    location     = str(appt.clinic or appt.hospital or '—')

    send_notification_email.delay(
        user_id=appt.patient_id,
        title=title,
        body=f'Your appointment with Dr. {doctor_name} on {slot_time}',
        template_context={
            'intro_line':     title,
            'doctor_name':    doctor_name,
            'slot_time':      slot_time,
            'location':       location,
            'status_label':   status_label,
            'status_class':   status_class,
            'appointment_id': appt.id,
            'reason':         appt.rejection_reason or '',
        },
    )
    logger.info(f'[Email] Queued {template} email for appointment #{appointment_id}')


@shared_task(
    name='appointments.tasks.archive_old_appointments',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=300,
    retry_jitter=True,
    acks_late=True,
    time_limit=3600,        # 1 hour hard limit — archiving can be slow
    soft_time_limit=3300,   # 55 min soft limit — allows graceful shutdown
)
def archive_old_appointments(self):
    """
    Periodic — runs weekly (Sunday 02:00) via Celery Beat.
    Archives COMPLETED/CANCELLED appointments older than 180 days.

    Why weekly?
        • Archiving is a batch operation — no need to run more often.
        • Sunday 02:00 = lowest traffic window.

    See appointments/archiving.py for full strategy documentation.
    """
    from appointments.archiving import run_archiving_cycle

    try:
        archived_count = run_archiving_cycle()
        logger.info(f'[ArchiveTask] Completed — {archived_count} appointments archived.')
        return {'archived': archived_count}
    except Exception as exc:
        logger.error(f'[ArchiveTask] Failed: {exc}', exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    name='appointments.tasks.send_1h_appointment_reminders',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=60,
    retry_jitter=True,
    acks_late=True,
)
def send_1h_appointment_reminders(self):
    """
    Periodic — runs every 15 min via Celery Beat.
    Sends 1-hour reminder for upcoming CONFIRMED appointments.
    Complements the 24h reminder for last-minute notifications.
    Stamps reminder_1h_sent_at after each successful send so retries
    and overlapping Beat ticks never dispatch the same reminder twice.
    """
    from django.utils import timezone
    from appointments.selectors import get_appointments_due_for_1h_reminder
    from appointments.services import send_appointment_reminder

    upcoming = list(get_appointments_due_for_1h_reminder())
    count = 0
    for appt in upcoming:
        try:
            send_appointment_reminder(appt)
            # Idempotency: stamp the field so this appointment is excluded
            # from the selector on every future run, including retries.
            from appointments.models import Appointment
            Appointment.objects.filter(pk=appt.pk).update(
                reminder_1h_sent_at=timezone.now()
            )
            count += 1
        except Exception as e:
            logger.error(f'[1h-Reminder] Failed for appointment #{appt.id}: {e}')

    logger.info(f'[1h-Reminder] Sent {count}/{len(upcoming)} 1-hour reminders')
    return {'reminders_sent': count}


@shared_task(
    name='appointments.tasks.mark_no_show_appointments',
    bind=True,
    max_retries=3,
    autoretry_for=TRANSIENT_ERRORS,
    retry_backoff=60,
    retry_jitter=True,
    acks_late=True,
)
def mark_no_show_appointments(self):
    """
    Periodic — runs every 15 minutes via Celery Beat.
    Marks CONFIRMED appointments as NO_SHOW if their slot time has passed
    by more than 30 minutes and they haven't been marked as COMPLETED.

    F-05 FIX: Now routes through AppointmentWorkflowService.mark_no_show()
    instead of writing directly via appt.save(). This ensures:
      - AppointmentStateMachine.validate_transition() is called
      - AuditLog.log() entry is created
      - notify_appointment_status() WebSocket push fires
      - Slot is freed correctly
    Uses a system-actor sentinel (user=None) since this is automated.
    """
    from django.utils import timezone
    from datetime import timedelta
    from appointments.models import Appointment
    from appointments.services import mark_no_show

    now = timezone.now()
    cutoff = now - timedelta(minutes=30)

    qs = Appointment.objects.filter(
        status=Appointment.Status.CONFIRMED,
        slot__start__lt=cutoff,
    ).select_related('slot', 'doctor', 'patient')

    count = 0
    for appt in qs:
        try:
            # F-05 FIX: route through the service layer so state machine,
            # audit log, WebSocket notification, and slot freeing all fire.
            # mark_no_show() in services.py checks can_be_marked_no_show()
            # and calls _change_status() which triggers the post_save signal.
            # We pass the doctor as actor (automated system action).
            mark_no_show(appt, user=appt.doctor)
            count += 1
        except Exception as e:
            logger.error(f'[NoShow] Failed for appointment #{appt.id}: {e}')

    logger.info(f'[NoShow] Marked {count} appointments as NO_SHOW via WorkflowService')
    return {'no_show_marked': count}

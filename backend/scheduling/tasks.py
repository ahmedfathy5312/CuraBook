"""
CuraBook — Scheduling Celery Tasks
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('curabook')


@shared_task(name='scheduling.tasks.generate_slots_for_next_30_days', bind=True, max_retries=2)
def generate_slots_for_all_schedules(self):
    """
    Runs daily at midnight.
    Generates slots for the next 7 days for all active schedules.
    """
    from .models import Schedule
    from .services import generate_slots_from_schedule

    today      = timezone.now().date()
    end_date   = today + timedelta(days=30)  # ✅ generate 30 days ahead
    schedules  = Schedule.objects.filter(is_active=True).select_related(
        'doctor', 'clinic', 'hospital'
    )

    total_created = 0
    for schedule in schedules:
        try:
            slots = generate_slots_from_schedule(
                schedule=schedule,
                start_date=today,
                end_date=end_date,
                override_existing=False,
            )
            total_created += len(slots)
        except Exception as e:
            logger.error(f'Failed to generate slots for schedule {schedule.id}: {e}')

    logger.info(f'Generated {total_created} slots for next 30 days.')
    return {'slots_created': total_created}


@shared_task(name='scheduling.tasks.generate_slots_for_schedule')
def generate_slots_for_schedule(schedule_id: int, days: int = 7):
    """
    On-demand: generate slots for a single schedule (e.g. when a new Schedule is created).
    """
    from .models import Schedule
    from .services import generate_slots_from_schedule

    try:
        schedule = Schedule.objects.get(id=schedule_id, is_active=True)
    except Schedule.DoesNotExist:
        logger.warning(f'Schedule {schedule_id} not found or inactive.')
        return

    today    = timezone.now().date()
    end_date = today + timedelta(days=days)

    slots = generate_slots_from_schedule(
        schedule=schedule,
        start_date=today,
        end_date=end_date,
        override_existing=False,
    )
    logger.info(f'Generated {len(slots)} slots for schedule {schedule_id}.')
    return {'slots_created': len(slots)}


# ─────────────────────────────────────────────────────────────────────────────
# SLOT EXPIRY — Cancel pending appointments after 30 minutes
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    name='scheduling.tasks.expire_pending_appointments',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def expire_pending_appointments(self):
    """
    Celery Beat task: runs every 5 minutes.
    Cancels PENDING appointments whose expires_at has passed.

    Triple protection against double-booking:
      1. Redis lock at booking time
      2. select_for_update() at booking time
      3. THIS task cleans up forgotten locks

    Schedule (celery.py):
        'expire-pending-appointments': {
            'task': 'scheduling.tasks.expire_pending_appointments',
            'schedule': crontab(minute='*/5'),
        }
    """
    import logging
    from django.utils import timezone
    from django.db import transaction

    logger = logging.getLogger("curabook.scheduling")

    try:
        from appointments.models import Appointment, AppointmentHistory
        from scheduling.models import GeneratedSlot

        now = timezone.now()
        expired_qs = Appointment.objects.filter(
            status=Appointment.Status.PENDING,
            expires_at__lt=now,
        ).select_related("slot")

        count = expired_qs.count()
        if count == 0:
            return {"cancelled": 0}

        expired_ids = list(expired_qs.values_list("id", flat=True))

        with transaction.atomic():
            # 1. Cancel all expired appointments
            expired_qs.update(status=Appointment.Status.CANCELLED)

            # 2. Free up the slots
            slot_ids = list(
                Appointment.objects.filter(id__in=expired_ids).values_list("slot_id", flat=True)
            )
            GeneratedSlot.objects.filter(id__in=slot_ids).update(is_booked=False)

            # 3. Record history for each
            history_entries = [
                AppointmentHistory(
                    appointment_id=appt_id,
                    old_status=Appointment.Status.PENDING,
                    new_status=Appointment.Status.CANCELLED,
                    note="Auto-cancelled: appointment expired (30 min timeout).",
                )
                for appt_id in expired_ids
            ]
            AppointmentHistory.objects.bulk_create(history_entries)

        logger.info(f"[SlotExpiry] Cancelled {count} expired pending appointments.")
        return {"cancelled": count}

    except Exception as exc:
        logger.error(f"[SlotExpiry] Task failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)

# Alias so 'from scheduling.tasks import generate_slots_for_next_30_days' works
generate_slots_for_next_30_days = generate_slots_for_all_schedules


# ─────────────────────────────────────────────────────────────────────────────
# MISS-06 FIX — Appointment Reminder Task (Celery scheduled)
# Sends 24h reminders to patients with confirmed appointments tomorrow.
# Schedule in settings: CELERY_BEAT_SCHEDULE['send_appointment_reminders']
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(name='scheduling.tasks.send_appointment_reminders', bind=True, max_retries=3)
def send_appointment_reminders(self):
    """
    Runs every day at 9:00 AM (configured in Celery Beat).
    Finds all CONFIRMED appointments scheduled for tomorrow and
    sends an in-app + email reminder notification to each patient.

    Idempotent: uses a reminder_sent flag on Appointment (or metadata check)
    to avoid double-sending if the task runs twice in a day.
    """
    from appointments.models import Appointment
    from notifications.services import notify_appointment_reminder

    tomorrow     = (timezone.now() + timedelta(days=1)).date()
    appointments = (
        Appointment.objects
        .filter(
            status='CONFIRMED',
            slot__start__date=tomorrow,
            reminder_24h_sent_at__isnull=True,  # guard against double-send
        )
        .select_related('patient', 'doctor', 'slot', 'clinic', 'hospital')
    )

    sent  = 0
    failed = 0
    for appt in appointments:
        try:
            notify_appointment_reminder(appt)
            # Mark as sent so we don't resend if task runs again
            Appointment.objects.filter(pk=appt.pk).update(
                reminder_24h_sent_at=timezone.now()
            )
            sent += 1
        except Exception as exc:
            failed += 1
            logger.error('[Reminder] Failed for appt %s: %s', appt.id, exc)

    logger.info('[Reminders] Sent=%s Failed=%s for date=%s', sent, failed, tomorrow)
    return {'sent': sent, 'failed': failed, 'date': str(tomorrow)}


@shared_task(name='scheduling.tasks.send_appointment_reminders_1h', bind=True, max_retries=2)
def send_appointment_reminders_1h(self):
    """
    Runs hourly. Sends a 1-hour-before reminder for imminent appointments.
    Targets appointments starting in the next 60–75 minutes that haven't
    received a short-notice reminder yet.
    """
    from appointments.models import Appointment
    from notifications.services import send_notification
    from notifications.models import Notification

    now         = timezone.now()
    window_start = now + timedelta(minutes=60)
    window_end   = now + timedelta(minutes=75)

    appointments = (
        Appointment.objects
        .filter(
            status='CONFIRMED',
            slot__start__range=(window_start, window_end),
            reminder_1h_sent=False,
        )
        .select_related('patient', 'doctor', 'slot')
    )

    for appt in appointments:
        try:
            doctor_name = appt.doctor.full_name or appt.doctor.username
            send_notification(
                user=appt.patient,
                title='⏰ موعدك خلال ساعة',
                body=f'تذكير: موعدك مع د. {doctor_name} خلال ساعة.',
                notif_type=Notification.Type.APPOINTMENT_REMINDER,
                metadata={'appointment_id': appt.id},
            )
            appt.reminder_1h_sent = True
            appt.save(update_fields=['reminder_1h_sent'])
        except Exception as exc:
            logger.error('[1h Reminder] Failed for appt %s: %s', appt.id, exc)

    return {'checked': appointments.count()}

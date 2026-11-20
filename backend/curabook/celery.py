import logging
logger = logging.getLogger(__name__)
"""
CuraBook — Celery Application
================================
Queue architecture:
  emails        → transactional emails
  notifications → push / WebSocket events
  reminders     → appointment reminders
  scheduling    → slot generation + expiry
  analytics     → dashboard stats, cleanup
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "curabook.settings.prod")

app = Celery("curabook")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# ─────────────────────────────────────────────────────────────────────────────
# Periodic Tasks (Celery Beat)
# ─────────────────────────────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Generate slots 30 days ahead — runs daily at 02:00
    "generate-slots-daily": {
        "task":     "scheduling.tasks.generate_slots_for_next_30_days",
        "schedule": crontab(hour=2, minute=0),
        "options":  {"queue": "scheduling"},
    },

    # ✅ FIX B-08: Cancel expired pending appointments every 5 minutes
    "expire-pending-appointments": {
        "task":     "appointments.tasks.expire_pending_appointments",  # FIXED: was scheduling.tasks
        "schedule": crontab(minute="*/5"),
        "options":  {"queue": "reminders"},
    },

    # Send appointment reminders — runs every 15 minutes
    # FIX: must point to appointments.tasks (uses reminder_24h_sent_at guard)
    # NOT notifications.tasks (uses slow JSON metadata lookup, ignores guard)
    "send-appointment-reminders": {
        "task":     "appointments.tasks.send_appointment_reminders",
        "schedule": crontab(minute="*/15"),
        "options":  {"queue": "reminders"},
    },

    # Send 1-hour appointment reminders — runs every 15 minutes for last-minute alerts
    "send-1h-appointment-reminders": {
        "task":     "appointments.tasks.send_1h_appointment_reminders",
        "schedule": crontab(minute="*/15"),
        "options":  {"queue": "reminders"},
    },

    # Cleanup old audit logs — runs monthly on 1st at 03:00 UTC
    # Retention period controlled by AUDIT_LOG_RETENTION_YEARS in settings.
    "cleanup-audit-logs": {
        "task":     "audit.tasks.cleanup_old_audit_logs",
        "schedule": crontab(day_of_month=1, hour=3, minute=0),
        "options":  {"queue": "analytics"},
    },

    # GDPR: Anonymise PII for deleted patients past retention period — runs monthly
    "anonymise-deleted-patients": {
        "task":     "audit.tasks.anonymise_deleted_patients",
        "schedule": crontab(day_of_month=1, hour=4, minute=0),
        "options":  {"queue": "analytics"},
    },

    # ✅ FIX #12: Archive old COMPLETED/CANCELLED appointments — runs weekly Sunday 02:00
    # Moves appointments older than 180 days to AppointmentArchive cold storage.
    # Keeps main appointments table lean → faster queries + lower DB costs.
    "archive-old-appointments": {
        "task":     "appointments.tasks.archive_old_appointments",
        "schedule": crontab(day_of_week=0, hour=2, minute=0),
        "options":  {"queue": "analytics"},
    },

    # SMS reminders (24h before appointment) — runs every 30 minutes
    "send-sms-reminders-24h": {
        "task":     "integrations.tasks.send_sms_reminders_24h",
        "schedule": crontab(minute="*/30"),
        "options":  {"queue": "reminders"},
    },

    # Audit Fix 4.6: Mark NO_SHOW for confirmed appointments 30+ min past their slot.
    "mark-no-show-appointments": {
        "task":     "appointments.tasks.mark_no_show_appointments",
        "schedule": crontab(minute="*/15"),
        "options":  {"queue": "reminders"},
    },

    # ── Daily Database Backup ────────────────────────────────────────────────────
    'daily-db-backup': {
        'task':     'core.backup.daily_database_backup',
        'schedule': crontab(hour=3, minute=0),          # كل يوم 03:00 UTC
        'options':  {'queue': 'analytics'},
    },

        # ── Billing tasks ──────────────────────────────────────────────────────────

    # Expire trials that have passed trial_end — runs daily at 01:00 UTC
    "billing-expire-trials": {
        "task":     "billing.tasks.expire_trials",
        "schedule": crontab(hour=1, minute=0),
        "options":  {"queue": "analytics"},
    },

    # Send trial expiry warnings (7d / 3d / 1d) — runs daily at 09:00 UTC
    "billing-trial-warnings": {
        "task":     "billing.tasks.send_trial_expiry_warnings",
        "schedule": crontab(hour=9, minute=0),
        "options":  {"queue": "reminders"},
    },

    # Reset monthly usage counters — runs on the 1st of each month at 00:05 UTC
    "billing-reset-usage": {
        "task":     "billing.tasks.reset_monthly_usage",
        "schedule": crontab(day_of_month=1, hour=0, minute=5),
        "options":  {"queue": "analytics"},
    },

    # Sync subscription status from Stripe (catch missed webhooks) — daily at 02:30 UTC
    "billing-sync-stripe": {
        "task":     "billing.tasks.sync_stripe_subscriptions",
        "schedule": crontab(hour=2, minute=30),
        "options":  {"queue": "analytics"},
    },
}

app.conf.timezone = "UTC"


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    logger.error(f"Request: {self.request!r}")

# ─────────────────────────────────────────────────────────────────────────────
# FIX: CONN_MAX_AGE + Celery Worker — Close DB connections on fork
# Without this, workers share the parent's persistent DB connections
# after os.fork(), causing "connection already closed" / SSL errors.
# ─────────────────────────────────────────────────────────────────────────────
from celery.signals import worker_process_init

@worker_process_init.connect
def close_db_connections_on_fork(**kwargs):
    """Close all Django DB connections after Celery forks a worker process."""
    import django
    django.setup()
    from django.db import connections
    connections.close_all()

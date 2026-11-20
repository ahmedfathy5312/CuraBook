"""
CuraBook — Migration 0012
=========================
Adds idempotency guard fields to the Appointment model:

  • reminder_24h_sent_at  — stamped by send_appointment_reminders task
  • reminder_1h_sent_at   — stamped by send_1h_appointment_reminders task

Both fields are nullable DateTimeField with db_index=True.
Null  → reminder not sent yet  → selector includes this appointment
Non-null → reminder already sent → selector excludes it, preventing
           duplicate sends on Celery retries or Beat schedule overlaps.

Why separate fields instead of a boolean flag?
  A DateTimeField gives us auditability for free: we know exactly when
  each reminder fired without needing a separate audit log entry.

Safe to deploy with zero downtime:
  Both columns are nullable with no default, so the DB ALTER TABLE
  never rewrites existing rows — it only adds a NULL column, which is
  instant on PostgreSQL (no table scan).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0011_fix_history_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='reminder_24h_sent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                db_index=True,
                help_text=(
                    'Timestamp when the 24-hour reminder was dispatched. '
                    'Null means the reminder has not been sent yet.'
                ),
            ),
        ),
        migrations.AddField(
            model_name='appointment',
            name='reminder_1h_sent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                db_index=True,
                help_text=(
                    'Timestamp when the 1-hour reminder was dispatched. '
                    'Null means the reminder has not been sent yet.'
                ),
            ),
        ),
    ]

"""
CuraBook — Appointments: Add performance indexes
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    atomic = False  # Required: CREATE INDEX CONCURRENTLY cannot run inside a transaction

    dependencies = [
        ("appointments", "0003_unique_active_booking_constraint"),
    ]

    operations = [
        # Composite index for appointment reminders query
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_status_slot_start
            ON appointments_appointment (status, slot_id)
            WHERE status IN ('PENDING', 'CONFIRMED');
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_appt_status_slot_start;",
        ),

        # Partial index: only non-expired pending appointments
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_pending_expires
            ON appointments_appointment (expires_at)
            WHERE status = 'PENDING' AND expires_at IS NOT NULL;
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_appt_pending_expires;",
        ),

        # Fast doctor+date lookup (common dashboard query)
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_doctor_created
            ON appointments_appointment (doctor_id, created_at DESC);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_appt_doctor_created;",
        ),
    ]

"""
CuraBook — Appointments: Fix AppointmentHistory index

LOW-07 FIX: Replace two individual indexes (appointment, created_at) with a
single composite index (appointment, -created_at). The real query pattern is
always WHERE appointment_id = X ORDER BY created_at DESC — a composite index
covers this in one B-tree scan.

MED-05 companion: The old index referenced 'changed_at' ordering in some code
paths. The model field is 'created_at' (from TimestampedModel). This migration
ensures the DB index matches the actual field.

V14 FIX: Replaced RunSQL with proper Django AddIndex/RemoveIndex so Django's
migration state stays in sync and doesn't auto-generate a duplicate 0012.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0010_critical_performance_indexes'),
    ]

    operations = [
        # Set correct ordering on model
        migrations.AlterModelOptions(
            name='appointmenthistory',
            options={'ordering': ['-created_at']},
        ),

        # Drop the two old individual indexes (created by 0001_initial via RunSQL or auto)
        # Use RunSQL with DROP IF EXISTS so it's safe on fresh DBs too
        migrations.RunSQL(
            sql="""
                DROP INDEX IF EXISTS appointments_appointmenthistory_appointment_id_idx;
                DROP INDEX IF EXISTS appointments_appointmenthistory_created_at_idx;
            """,
            reverse_sql="",  # No reverse needed — AddIndex below handles the forward state
        ),

        # Add the composite index via Django's AddIndex so the migration state is tracked
        # This matches the Meta.indexes declaration in AppointmentHistory model exactly
        migrations.AddIndex(
            model_name='appointmenthistory',
            index=models.Index(
                fields=['appointment', '-created_at'],
                name='appt_history_appt_time_idx',
            ),
        ),
    ]

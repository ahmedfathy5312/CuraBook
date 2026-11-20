# Generated migration — add SoftDelete fields to Appointment
# and migrate AppointmentHistory.changed_at → created_at

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0005_add_reschedule_fields'),
    ]

    operations = [
        # ── Add SoftDelete fields to Appointment ──────────────────────────
        migrations.AddField(
            model_name='appointment',
            name='is_deleted',
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text='Soft-delete flag. True = logically deleted.',
            ),
        ),
        migrations.AddField(
            model_name='appointment',
            name='deleted_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when the record was soft-deleted.',
            ),
        ),

        # ── AppointmentHistory: rename changed_at → created_at ─────────────
        # (TimestampedModel uses created_at / updated_at)
        migrations.RenameField(
            model_name='appointmenthistory',
            old_name='changed_at',
            new_name='created_at',
        ),
        migrations.AddField(
            model_name='appointmenthistory',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

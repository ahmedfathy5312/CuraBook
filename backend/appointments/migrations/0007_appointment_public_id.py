"""
Migration: Add public_id UUID field to Appointment model.

This is Step 1 of the zero-downtime UUID migration strategy:
  - Adds public_id alongside the existing integer PK (no FK changes)
  - All new records get a UUID automatically (default=uuid.uuid4)
  - Existing records get backfilled in the RunPython step below
  - API serializers should expose public_id instead of id going forward

Step 2 (future): once all clients use public_id, swap the primary key
                 (requires maintenance window or blue/green deploy).
"""

import uuid
from django.db import migrations, models


def backfill_public_ids(apps, schema_editor):
    """Assign a unique UUID to every existing Appointment row."""
    Appointment = apps.get_model('appointments', 'Appointment')
    # Use bulk_update for efficiency — avoids N individual SQL UPDATE calls
    appointments = Appointment.objects.filter(public_id__isnull=True)
    for appt in appointments:
        appt.public_id = uuid.uuid4()
    if appointments:
        Appointment.objects.bulk_update(appointments, ['public_id'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0006_appointment_softdelete_timestamped'),
    ]

    operations = [
        # 1. Add the column (nullable first so existing rows don't fail)
        migrations.AddField(
            model_name='appointment',
            name='public_id',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                null=True,          # temporarily nullable for backfill
                help_text='Stable public UUID — use in API responses instead of integer id.',
            ),
        ),
        # 2. Backfill existing rows
        migrations.RunPython(backfill_public_ids, migrations.RunPython.noop),
        # 3. Now enforce NOT NULL + UNIQUE
        migrations.AlterField(
            model_name='appointment',
            name='public_id',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                null=False,
                unique=True,
                db_index=True,
                help_text='Stable public UUID — use in API responses instead of integer id.',
            ),
        ),
    ]

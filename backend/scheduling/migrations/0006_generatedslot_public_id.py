"""
Migration: Add public_id (UUID) to GeneratedSlot
Phase 1 of UUID migration — zero-downtime approach.
GeneratedSlot IDs are exposed in the booking API — UUID prevents enumeration.
"""

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0005_scheduling_softdelete_timestamps'),
    ]

    operations = [
        migrations.AddField(
            model_name='generatedslot',
            name='public_id',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                db_index=True,
                help_text='Stable public UUID — use this in booking API responses instead of integer id.',
            ),
        ),
    ]

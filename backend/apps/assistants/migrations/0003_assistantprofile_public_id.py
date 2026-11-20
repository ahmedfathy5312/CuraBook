"""
Migration: Add public_id (UUID) to AssistantProfile
Phase 1 of UUID migration — zero-downtime approach.
"""

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assistants', '0002_assistantprofile_basemodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='assistantprofile',
            name='public_id',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                db_index=True,
                help_text='Stable public UUID — use this in API responses instead of the integer id.',
            ),
        ),
    ]

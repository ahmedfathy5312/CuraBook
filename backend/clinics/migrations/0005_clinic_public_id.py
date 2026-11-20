"""
Migration: Add public_id (UUID) to Clinic
==========================================
Phase 1 of UUID migration strategy:
  - Adds public_id alongside existing integer PK (zero-downtime)
  - API serializers will expose public_id instead of raw integer id
  - Phase 2 (future): swap PK after all clients updated

This follows the zero-downtime pattern defined in common/models.py.
"""

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0004_clinic_geo_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='clinic',
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

"""
Migration: Add NO_SHOW to Appointment.Status choices
FIX: BUG-04 — NO_SHOW status missing from enterprise spec
"""

from django.db import migrations
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0008_appointment_archive'),
    ]

    operations = [
        # TextChoices changes don't need a schema change — Django stores the raw value.
        # This migration documents the intent and ensures the choice is valid
        # at the DB constraint level in future AlterField operations.
        migrations.AlterField(
            model_name='appointment',
            name='status',
            field=__import__('django.db.models', fromlist=['CharField']).CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('CONFIRMED', 'Confirmed'),
                    ('REJECTED', 'Rejected'),
                    ('CANCELLED', 'Cancelled'),
                    ('COMPLETED', 'Completed'),
                    ('RESCHEDULE_REQUESTED', 'Reschedule Requested'),
                    ('NO_SHOW', 'No Show'),
                ],
                default='PENDING',
                max_length=30,
            ),
        ),
    ]

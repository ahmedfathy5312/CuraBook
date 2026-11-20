"""
Migration: Add DB-level unique constraint for double-booking prevention.

This is a SAFE migration — only adds a new constraint.
Existing data must not have duplicate active bookings per slot
(enforced by application logic already).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0002_fix_appointment_model'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='appointment',
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    status__in=['PENDING', 'CONFIRMED', 'COMPLETED', 'RESCHEDULE_REQUESTED']
                ),
                fields=['slot'],
                name='unique_active_booking_per_slot',
            ),
        ),
    ]

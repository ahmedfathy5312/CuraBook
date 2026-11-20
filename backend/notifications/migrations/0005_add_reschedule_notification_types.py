"""
Migration: Add RESCHEDULE and NO_SHOW notification types
FIX: BUG-08 — Reschedule notification types were missing
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_notification_soft_delete'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('NEW_APPOINTMENT', 'New Appointment'),
                    ('APPOINTMENT_CONFIRMED', 'Appointment Confirmed'),
                    ('APPOINTMENT_REJECTED', 'Appointment Rejected'),
                    ('APPOINTMENT_CANCELLED', 'Appointment Cancelled'),
                    ('APPOINTMENT_COMPLETED', 'Appointment Completed'),
                    ('APPOINTMENT_REMINDER', 'Appointment Reminder'),
                    ('APPOINTMENT_NO_SHOW', 'Appointment No Show'),
                    ('RESCHEDULE_REQUESTED', 'Reschedule Requested'),
                    ('RESCHEDULE_APPROVED', 'Reschedule Approved'),
                    ('RESCHEDULE_REJECTED', 'Reschedule Rejected'),
                    ('SYSTEM', 'System'),
                ],
                default='SYSTEM',
                max_length=40,
            ),
        ),
    ]

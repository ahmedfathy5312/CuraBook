"""
CuraBook — Migration: Add reschedule_slot and reschedule_reason to Appointment
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0004_performance_indexes'),
        ('scheduling', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='reschedule_slot',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reschedule_appointment',
                to='scheduling.generatedslot',
                help_text='New slot requested in a RESCHEDULE_REQUESTED flow',
            ),
        ),
        migrations.AddField(
            model_name='appointment',
            name='reschedule_reason',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Reason provided by patient when requesting reschedule',
            ),
        ),
    ]

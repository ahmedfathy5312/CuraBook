"""
Migration: add medical_id to PatientRecord
FIX: Backend spec requires medical_id (prototype slide 43 shows "Patient ID" column).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0003_patientrecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='patientrecord',
            name='medical_id',
            field=models.CharField(
                blank=True,
                help_text='Auto-generated unique medical record ID (e.g. MR-2026-00042)',
                max_length=50,
                unique=True,
                default='',
            ),
            preserve_default=False,
        ),
    ]

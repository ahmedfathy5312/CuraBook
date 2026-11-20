"""
Migration: Create AppointmentArchive table
==========================================
Cold storage for old COMPLETED/CANCELLED appointments.
Populated weekly by appointments.tasks.archive_old_appointments.
"""

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0007_appointment_public_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppointmentArchive',
            fields=[
                ('id', models.UUIDField(
                    primary_key=True,
                    default=uuid.uuid4,
                    editable=False,
                )),
                ('original_appointment_id', models.IntegerField(
                    db_index=True,
                    help_text='Integer PK of the original Appointment row.',
                )),
                ('original_public_id', models.UUIDField(
                    db_index=True,
                    null=True,
                    blank=True,
                    help_text='public_id of the original Appointment (UUID).',
                )),
                ('patient_id', models.IntegerField(db_index=True)),
                ('doctor_id',  models.IntegerField(db_index=True)),
                ('final_status', models.CharField(max_length=30, db_index=True)),
                ('snapshot', models.JSONField(
                    help_text='Full serialized snapshot of the appointment at archive time.',
                )),
                ('appointment_created_at', models.DateTimeField()),
                ('archived_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Appointment Archive',
                'verbose_name_plural': 'Appointment Archives',
                'ordering': ['-archived_at'],
                'indexes': [
                    models.Index(fields=['patient_id', 'archived_at'],
                                 name='appt_arch_patient_idx'),
                    models.Index(fields=['doctor_id', 'archived_at'],
                                 name='appt_arch_doctor_idx'),
                    models.Index(fields=['final_status', 'archived_at'],
                                 name='appt_arch_status_idx'),
                ],
            },
        ),
    ]

"""
Migration: Add PatientRecord model
FIX: BUG-03 — PatientRecord was completely missing, data was lost on every refresh
"""

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0002_patientprofile_timestamps'),
        ('appointments', '0009_appointment_no_show_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PatientRecord',
            fields=[
                # BaseModel: UUID PK
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                )),
                # SoftDeleteModel
                ('is_deleted', models.BooleanField(default=False, db_index=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                # TimestampedModel
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                # Relations
                ('patient', models.ForeignKey(
                    limit_choices_to={'is_patient': True},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='patient_records',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('doctor', models.ForeignKey(
                    blank=True,
                    limit_choices_to={'is_doctor': True},
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='doctor_patient_records',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('appointment', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='patient_records',
                    to='appointments.appointment',
                )),
                # Medical data
                ('chief_complaint', models.TextField(blank=True)),
                ('diagnosis', models.TextField(blank=True)),
                ('treatment_plan', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('blood_type', models.CharField(
                    blank=True,
                    choices=[
                        ('A+', 'A+'), ('A-', 'A-'),
                        ('B+', 'B+'), ('B-', 'B-'),
                        ('AB+', 'AB+'), ('AB-', 'AB-'),
                        ('O+', 'O+'), ('O-', 'O-'),
                        ('UNKNOWN', 'Unknown'),
                    ],
                    default='UNKNOWN',
                    max_length=10,
                )),
                ('allergies', models.TextField(blank=True)),
                ('chronic_diseases', models.TextField(blank=True)),
                ('current_medications', models.TextField(blank=True)),
                ('visit_date', models.DateField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Patient Record',
                'verbose_name_plural': 'Patient Records',
                'ordering': ['-created_at'],
            },
        ),
    ]

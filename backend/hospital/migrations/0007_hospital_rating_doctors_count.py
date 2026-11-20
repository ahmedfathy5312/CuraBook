"""
Migration: Add rating + doctors_count to Hospital model.
Add related_name='hospital_doctor_links' to HospitalDoctor.department FK.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hospital', '0006_fix_hospital_slug'),
        ('departments', '0001_initial'),
    ]

    operations = [
        # Add rating field
        migrations.AddField(
            model_name='hospital',
            name='rating',
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                help_text='Average rating (0.0–5.0), updated by review signals',
                max_digits=3,
                null=True,
            ),
        ),
        # Add doctors_count field
        migrations.AddField(
            model_name='hospital',
            name='doctors_count',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Cached count of active doctors, updated by signals',
            ),
        ),
        # Update related_name on HospitalDoctor.department FK
        migrations.AlterField(
            model_name='hospitaldoctor',
            name='department',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='department_doctors',
                to='departments.department',
            ),
        ),
    ]

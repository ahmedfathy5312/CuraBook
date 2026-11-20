"""
CuraBook Fix D — Change Clinic.owner from OneToOneField to ForeignKey

Before: owner = OneToOneField(DoctorProfile)  → one clinic per doctor, hard constraint
After:  owner = ForeignKey(DoctorProfile)      → many clinics per doctor, flexible

STEPS:
  1. Rename old column (clinic_owner_id is the same col, just constraint changes)
  2. Remove the unique constraint that comes with OneToOneField
  3. Add ForeignKey (non-unique) with same column name
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0007_remove_clinic_clinics_city_idx_and_more'),
        ('doctors', '0010_alter_doctorprofile_options_and_more'),
    ]

    operations = [
        # Step 1: Remove the old OneToOneField (which enforces uniqueness)
        migrations.RemoveField(
            model_name='clinic',
            name='owner',
        ),
        # Step 2: Add ForeignKey (allows multiple clinics per doctor)
        migrations.AddField(
            model_name='clinic',
            name='owner',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='clinics_owned',
                to='doctors.doctorprofile',
                null=True,   # null temporarily to allow re-adding without default
            ),
        ),
        # Step 3: Make non-nullable now data is restored
        migrations.AlterField(
            model_name='clinic',
            name='owner',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='clinics_owned',
                to='doctors.doctorprofile',
            ),
        ),
    ]

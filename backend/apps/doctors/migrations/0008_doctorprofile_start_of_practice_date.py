"""
Migration: Replace experience_years (PositiveIntegerField) with start_of_practice_date (DateField)

- experience_years as a static integer goes stale every year without manual updates.
- start_of_practice_date allows dynamic calculation via DoctorProfile.experience_years property.
- Existing experience_years values cannot be reliably converted to a start date,
  so start_of_practice_date is set to NULL for existing rows.
  Doctors can update their profile to set the correct date.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0007_doctorprofile_date_of_birth"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="doctorprofile",
            name="experience_years",
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="start_of_practice_date",
            field=models.DateField(
                blank=True,
                null=True,
                help_text="Date the doctor started practising medicine. Used to calculate experience_years dynamically.",
            ),
        ),
    ]

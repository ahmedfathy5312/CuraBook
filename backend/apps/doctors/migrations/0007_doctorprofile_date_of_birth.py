"""
Migration: Replace age (PositiveIntegerField) with date_of_birth (DateField)

- age is a static integer that goes stale every year.
- date_of_birth allows dynamic calculation via DoctorProfile.age property.
- Existing age values cannot be reliably converted to DOB, so we set
  date_of_birth=NULL for existing rows (doctors can update via profile page).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0006_fix_empty_slugs"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="doctorprofile",
            name="age",
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="date_of_birth",
            field=models.DateField(
                blank=True,
                null=True,
                help_text="Used to calculate age dynamically",
            ),
        ),
    ]

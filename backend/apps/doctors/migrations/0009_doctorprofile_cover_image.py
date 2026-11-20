"""
Migration 0009 — Add cover_image to DoctorProfile
===================================================
Adds a nullable URLField for the doctor's profile banner / cover photo.
The field is intentionally separate from profile_image (headshot) so
each can be updated independently.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0008_doctorprofile_start_of_practice_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="doctorprofile",
            name="cover_image",
            field=models.URLField(
                blank=True,
                help_text="URL of doctor profile cover/banner image (stored in S3 / CDN)",
                max_length=500,
                null=True,
            ),
        ),
    ]

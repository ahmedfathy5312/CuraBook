"""
Migration: Add experience_years, education, languages, certificates, profile_image
to DoctorProfile.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="doctorprofile",
            name="experience_years",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text="Years of professional experience",
            ),
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="education",
            field=models.JSONField(
                default=list,
                blank=True,
                help_text=(
                    'List of education entries. '
                    'Example: [{"degree": "MD", "university": "Cairo University", "year": 2010}]'
                ),
            ),
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="languages",
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='Languages spoken. Example: ["Arabic", "English"]',
            ),
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="certificates",
            field=models.JSONField(
                default=list,
                blank=True,
                help_text=(
                    'List of certificates. '
                    'Example: [{"title": "Board Certified", "issuer": "EMA", "year": 2015}]'
                ),
            ),
        ),
        migrations.AddField(
            model_name="doctorprofile",
            name="profile_image",
            field=models.URLField(
                max_length=500,
                blank=True,
                null=True,
                help_text="URL of doctor profile photo (stored in S3 / CDN)",
            ),
        ),
    ]

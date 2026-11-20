"""
Migration: Remove doctor_token and patient_token from VideoSession

Security improvement: tokens are no longer stored in the database.
They are generated on-demand via VideoSession.get_token() with a 15-minute TTL.

Rationale:
- Storing long-lived JWT tokens in the DB means a DB breach = permanent room access.
- On-demand generation ensures tokens expire within 15 minutes regardless.
- The room_name is still stored and is used to generate fresh tokens per request.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("video", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="videosession",
            name="doctor_token",
        ),
        migrations.RemoveField(
            model_name="videosession",
            name="patient_token",
        ),
    ]

"""
SEC-03 FIX: Add SoftDelete fields to Prescription model.
Medical records must never be hard-deleted per PRIVACY_AND_COMPLIANCE.md
(Egyptian MoH 7-year retention requirement).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("prescriptions", "0002_prescription_attachment_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="prescription",
            name="is_deleted",
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name="prescription",
            name="deleted_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]

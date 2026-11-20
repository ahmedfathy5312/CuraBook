"""
Migration: Add city, logo, is_verified to Hospital.
          Add price to HospitalDoctor.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hospital", "0003_hospital_soft_delete"),
    ]

    operations = [
        # Hospital — city
        migrations.AddField(
            model_name="hospital",
            name="city",
            field=models.CharField(
                max_length=100,
                blank=True,
                help_text="City where hospital is located",
            ),
        ),
        # Hospital — logo
        migrations.AddField(
            model_name="hospital",
            name="logo",
            field=models.URLField(
                max_length=500,
                blank=True,
                null=True,
                help_text="URL of hospital logo (stored in S3 / CDN)",
            ),
        ),
        # Hospital — is_verified
        migrations.AddField(
            model_name="hospital",
            name="is_verified",
            field=models.BooleanField(
                default=False,
                help_text="Verified by platform admin",
            ),
        ),
        # HospitalDoctor — price
        migrations.AddField(
            model_name="hospitaldoctor",
            name="price",
            field=models.DecimalField(
                max_digits=8,
                decimal_places=2,
                null=True,
                blank=True,
                help_text="Consultation price at this hospital (overrides doctor default)",
            ),
        ),
    ]

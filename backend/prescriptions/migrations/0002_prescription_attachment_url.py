from django.db import migrations, models


class Migration(migrations.Migration):
    """B-05: Add optional attachment_url field to Prescription for PDF/file support."""

    dependencies = [
        ("prescriptions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="prescription",
            name="attachment_url",
            field=models.URLField(
                blank=True,
                null=True,
                help_text="Optional URL to a PDF/image of the prescription (S3, media, etc.)",
            ),
        ),
    ]

"""CuraBook — Contact: Initial migration"""

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ContactMessage",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",       models.CharField(max_length=255)),
                ("email",      models.EmailField()),
                ("subject",    models.CharField(blank=True, max_length=255)),
                ("message",    models.TextField()),
                ("status",     models.CharField(
                    choices=[
                        ("new",      "New"),
                        ("read",     "Read"),
                        ("replied",  "Replied"),
                        ("archived", "Archived"),
                    ],
                    db_index=True,
                    default="new",
                    max_length=20,
                )),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
            ],
            options={
                "verbose_name":        "Contact Message",
                "verbose_name_plural": "Contact Messages",
                "ordering":            ["-created_at"],
            },
        ),
    ]

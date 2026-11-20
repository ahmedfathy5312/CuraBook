"""
Initial migration for locations app — Governorate + City models.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Governorate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name_ar", models.CharField(max_length=100, verbose_name="Arabic Name")),
                ("name_en", models.CharField(max_length=100, verbose_name="English Name")),
                ("slug", models.SlugField(unique=True)),
                ("order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["order", "name_en"], "verbose_name": "Governorate", "verbose_name_plural": "Governorates"},
        ),
        migrations.CreateModel(
            name="City",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name_ar", models.CharField(max_length=150, verbose_name="Arabic Name")),
                ("name_en", models.CharField(max_length=150, verbose_name="English Name")),
                ("slug", models.SlugField(unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("governorate", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="cities",
                    to="locations.governorate",
                )),
            ],
            options={"ordering": ["name_en"], "verbose_name": "City", "verbose_name_plural": "Cities"},
        ),
        migrations.AddIndex(
            model_name="city",
            index=models.Index(fields=["slug"], name="locations_city_slug_idx"),
        ),
        migrations.AddIndex(
            model_name="city",
            index=models.Index(fields=["is_active"], name="locations_city_active_idx"),
        ),
    ]

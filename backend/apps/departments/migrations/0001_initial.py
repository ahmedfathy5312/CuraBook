from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("hospital", "0001_initial"),
    ]
    operations = [
        migrations.CreateModel(
            name="Department",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("hospital", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="app_departments",
                    to="hospital.hospital",
                )),
                ("name",        models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("is_active",   models.BooleanField(default=True)),
            ],
            options={
                "db_table": "departments_department",
                "unique_together": {("hospital", "name")},
            },
        ),
    ]

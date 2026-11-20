from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="DoctorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="doctor_profile",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("specialty", models.CharField(blank=True, max_length=255)),
                ("license_number", models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ("gender", models.CharField(blank=True, max_length=20)),
                ("age", models.PositiveIntegerField(blank=True, null=True)),
                ("bio", models.TextField(blank=True, null=True)),
                ("consultation_fee", models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ("slug", models.SlugField(blank=True, max_length=255, null=True, unique=True)),
                ("accepts_booking", models.BooleanField(default=True)),
                ("profile_completed", models.BooleanField(default=False)),
                ("slot_duration", models.PositiveIntegerField(default=30)),
            ],
            options={"db_table": "doctors_doctorprofile", "verbose_name": "Doctor Profile"},
        ),
        migrations.AddIndex(
            model_name="doctorprofile",
            index=models.Index(fields=["specialty"], name="doctors_specialty_idx"),
        ),
        migrations.AddIndex(
            model_name="doctorprofile",
            index=models.Index(fields=["slug"], name="doctors_slug_idx"),
        ),
    ]

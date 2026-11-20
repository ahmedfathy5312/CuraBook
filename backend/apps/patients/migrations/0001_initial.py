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
            name="PatientProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="patient_profile",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("dob", models.DateField(blank=True, null=True)),
                ("gender", models.CharField(blank=True, max_length=20)),
                ("age", models.PositiveIntegerField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, null=True)),
            ],
            options={"db_table": "patients_patientprofile", "verbose_name": "Patient Profile"},
        ),
    ]

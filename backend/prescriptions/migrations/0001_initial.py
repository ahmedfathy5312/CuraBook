from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("appointments", "0004_performance_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="Prescription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("diagnosis", models.TextField(help_text="Doctor's diagnosis notes")),
                ("notes", models.TextField(blank=True, help_text="Additional instructions")),
                ("status", models.CharField(
                    choices=[("DRAFT", "Draft"), ("SENT", "Sent")],
                    db_index=True,
                    default="DRAFT",
                    max_length=10,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("appointment", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="prescriptions",
                    to="appointments.appointment",
                )),
                ("doctor", models.ForeignKey(
                    limit_choices_to={"is_doctor": True},
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="prescriptions_written",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("patient", models.ForeignKey(
                    limit_choices_to={"is_patient": True},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="prescriptions_received",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PrescriptionMedication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(help_text="Drug name", max_length=255)),
                ("dosage", models.CharField(help_text="e.g. 500mg", max_length=100)),
                ("frequency", models.CharField(
                    choices=[
                        ("ONCE_DAILY", "Once daily"),
                        ("TWICE_DAILY", "Twice daily"),
                        ("THREE_DAILY", "Three times daily"),
                        ("FOUR_DAILY", "Four times daily"),
                        ("AS_NEEDED", "As needed"),
                        ("OTHER", "Other"),
                    ],
                    default="ONCE_DAILY",
                    max_length=20,
                )),
                ("duration", models.CharField(blank=True, help_text="e.g. 7 days", max_length=100)),
                ("notes", models.TextField(blank=True)),
                ("prescription", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="medications",
                    to="prescriptions.prescription",
                )),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.AddIndex(
            model_name="prescription",
            index=models.Index(fields=["doctor", "status"], name="rx_doctor_status_idx"),
        ),
        migrations.AddIndex(
            model_name="prescription",
            index=models.Index(fields=["patient", "status"], name="rx_patient_status_idx"),
        ),
    ]

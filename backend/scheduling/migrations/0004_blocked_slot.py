"""
CuraBook — Scheduling: Add BlockedSlot model
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0003_remove_workinghours"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BlockedSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("doctor", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="blocked_slots",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("clinic", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="blocked_slots",
                    to="clinics.clinic",
                )),
                ("hospital", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="blocked_slots",
                    to="hospital.hospital",
                )),
                ("start_date", models.DateField()),
                ("end_date",   models.DateField()),
                ("reason",     models.CharField(
                    max_length=20,
                    choices=[
                        ("vacation", "Doctor Vacation"),
                        ("conference", "Medical Conference"),
                        ("maintenance", "Clinic/Hospital Maintenance"),
                        ("emergency", "Emergency Closure"),
                        ("other", "Other"),
                    ],
                    default="other",
                )),
                ("note",       models.TextField(blank=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="created_blocked_slots",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"verbose_name": "Blocked Slot", "verbose_name_plural": "Blocked Slots"},
        ),
        migrations.AddIndex(
            model_name="blockedslot",
            index=models.Index(
                fields=["doctor", "start_date", "end_date"],
                name="scheduling_blocked_doctor_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="blockedslot",
            index=models.Index(
                fields=["clinic", "start_date"],
                name="scheduling_blocked_clinic_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="blockedslot",
            index=models.Index(
                fields=["hospital", "start_date"],
                name="scheduling_blocked_hospital_idx",
            ),
        ),
    ]

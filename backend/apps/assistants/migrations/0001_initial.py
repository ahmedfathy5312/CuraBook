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
            name="AssistantProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="assistant_profile",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("can_manage_appointments", models.BooleanField(default=True)),
                ("can_upload_documents", models.BooleanField(default=False)),
                ("can_edit_schedule", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "assistants_assistantprofile", "verbose_name": "Assistant Profile"},
        ),
    ]

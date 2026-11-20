from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0013_remove_appointmenthistory_appointment_appoint_8fa800_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='session_notes',
            field=models.TextField(blank=True, help_text="Doctor's notes after session completion", null=True),
        ),
    ]

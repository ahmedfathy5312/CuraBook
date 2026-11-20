from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users_legacy', '0002_remove_doctorprofile_users_docto_special_d9158a_idx_and_more'),
    ]

    operations = [
        # Remove the old direct doctor FK from AssistantProfile
        migrations.RemoveField(
            model_name='assistantprofile',
            name='doctor',
        ),
        # Remove old permission fields
        migrations.RemoveField(
            model_name='assistantprofile',
            name='can_edit_profile',
        ),
        # Add new fields
        migrations.AddField(
            model_name='assistantprofile',
            name='can_edit_schedule',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='assistantprofile',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name='assistantprofile',
            name='can_manage_appointments',
            field=models.BooleanField(default=True),
        ),
    ]

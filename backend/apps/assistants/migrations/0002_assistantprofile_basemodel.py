# Generated migration — AssistantProfile: add SoftDelete + updated_at
# (created_at already exists in previous migration)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assistants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='assistantprofile',
            name='is_deleted',
            field=models.BooleanField(
                default=False, db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='assistantprofile',
            name='deleted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='assistantprofile',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Note: created_at was added in 0001_initial — no change needed
    ]

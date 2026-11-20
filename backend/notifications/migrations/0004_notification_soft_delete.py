"""
Migration: Add soft-delete fields to Notification model.
Notification inherits SoftDeleteModel but the migration was missing.
Safe — adds nullable/default fields only.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_notificationpreferences'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='is_deleted',
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='deleted_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when soft-deleted.',
            ),
        ),
    ]

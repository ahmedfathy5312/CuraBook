"""
Migration: Add soft-delete fields to Review model.
Review inherits SoftDeleteModel but the migration was missing.
Safe — adds nullable/default fields only.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_deleted',
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='review',
            name='deleted_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when soft-deleted.',
            ),
        ),
    ]

"""
Migration: Add soft-delete fields to Clinic model.
Safe — adds nullable fields only.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0002_clinicassistant'),
    ]

    operations = [
        migrations.AddField(
            model_name='clinic',
            name='is_deleted',
            field=models.BooleanField(default=False, db_index=True,
                                      help_text='Soft-delete flag.'),
        ),
        migrations.AddField(
            model_name='clinic',
            name='deleted_at',
            field=models.DateTimeField(null=True, blank=True,
                                       help_text='Timestamp when soft-deleted.'),
        ),
    ]

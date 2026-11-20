from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0001_initial'),
    ]

    operations = [
        # Rename user → actor
        migrations.RenameField(model_name='auditlog', old_name='user', new_name='actor'),

        # Add ip_address field
        migrations.AddField(
            model_name='auditlog',
            name='ip_address',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),

        # Rename old_value → old_data, new_value → new_data
        migrations.RenameField(model_name='auditlog', old_name='old_value', new_name='old_data'),
        migrations.RenameField(model_name='auditlog', old_name='new_value', new_name='new_data'),

        # Rename created_at → timestamp
        migrations.RenameField(model_name='auditlog', old_name='created_at', new_name='timestamp'),

        # Add metadata field
        migrations.AddField(
            model_name='auditlog',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),

        # Update action choices to include new values
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('login', 'Login'), ('logout', 'Logout'), ('register', 'Register'),
                    ('create', 'Create'), ('update', 'Update'), ('delete', 'Delete'),
                    ('booking', 'Booking'), ('confirm', 'Confirm'), ('reject', 'Reject'),
                    ('cancel', 'Cancel'), ('complete', 'Complete'),
                    ('schedule_update', 'Schedule Update'), ('user_created', 'User Created'),
                ],
                db_index=True, max_length=32,
            ),
        ),

        # Add new indexes
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action', 'timestamp'], name='audit_action_ts_idx'),
        ),
    ]

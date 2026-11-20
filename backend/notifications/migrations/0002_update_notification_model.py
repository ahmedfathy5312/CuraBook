from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        # Add type field
        migrations.AddField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('NEW_APPOINTMENT',       'New Appointment'),
                    ('APPOINTMENT_CONFIRMED', 'Appointment Confirmed'),
                    ('APPOINTMENT_REJECTED',  'Appointment Rejected'),
                    ('APPOINTMENT_CANCELLED', 'Appointment Cancelled'),
                    ('APPOINTMENT_COMPLETED', 'Appointment Completed'),
                    ('APPOINTMENT_REMINDER',  'Appointment Reminder'),
                    ('SYSTEM',               'System'),
                ],
                default='SYSTEM',
                max_length=40,
            ),
        ),
        # Rename message → body
        migrations.RenameField(
            model_name='notification',
            old_name='message',
            new_name='body',
        ),
        # Rename read → is_read
        migrations.RenameField(
            model_name='notification',
            old_name='read',
            new_name='is_read',
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read'], name='notif_user_read_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'created_at'], name='notif_user_date_idx'),
        ),
    ]

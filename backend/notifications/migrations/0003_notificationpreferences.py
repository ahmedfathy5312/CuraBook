# Generated migration — add NotificationPreferences model

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_update_notification_model'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPreferences',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name='ID',
                )),
                ('email_enabled', models.BooleanField(
                    default=True,
                    help_text='Receive appointment emails.',
                )),
                ('push_enabled', models.BooleanField(
                    default=True,
                    help_text='Receive mobile push notifications.',
                )),
                ('in_app_enabled', models.BooleanField(
                    default=True,
                    help_text='Receive in-app WebSocket notifications.',
                )),
                ('notify_on_appointment_confirmed', models.BooleanField(default=True)),
                ('notify_on_appointment_rejected', models.BooleanField(default=True)),
                ('notify_on_appointment_cancelled', models.BooleanField(default=True)),
                ('notify_on_appointment_reminder', models.BooleanField(default=True)),
                ('notify_on_new_review', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_preferences',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Notification Preferences',
                'verbose_name_plural': 'Notification Preferences',
            },
        ),
    ]

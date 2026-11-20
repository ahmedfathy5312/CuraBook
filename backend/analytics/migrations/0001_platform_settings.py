from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='PlatformSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform_name',          models.CharField(default='CuraBook', max_length=120)),
                ('language',               models.CharField(default='ar', max_length=10)),
                ('timezone',               models.CharField(default='Africa/Cairo', max_length=60)),
                ('currency',               models.CharField(default='EGP', max_length=10)),
                ('cancel_window',          models.IntegerField(default=24)),
                ('max_reschedule',         models.IntegerField(default=2)),
                ('slot_duration',          models.IntegerField(default=30)),
                ('maintenance_mode',       models.BooleanField(default=False)),
                ('notify_new_booking',     models.BooleanField(default=True)),
                ('notify_cancellation',    models.BooleanField(default=True)),
                ('notify_new_user',        models.BooleanField(default=False)),
                ('notify_system_alerts',   models.BooleanField(default=True)),
                ('notify_low_rating',      models.BooleanField(default=True)),
                ('notify_daily_summary',   models.BooleanField(default=False)),
                ('theme',                  models.CharField(default='system', max_length=20)),
                ('font_size',              models.CharField(default='md', max_length=10)),
                ('sidebar_style',          models.CharField(default='dark', max_length=20)),
                ('updated_at',             models.DateTimeField(auto_now=True)),
            ],
            options={'verbose_name': 'Platform Settings', 'verbose_name_plural': 'Platform Settings'},
        ),
    ]

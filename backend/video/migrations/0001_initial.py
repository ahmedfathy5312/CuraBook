from django.db import migrations, models
import django.db.models.deletion
import uuid

class Migration(migrations.Migration):
    initial = True
    dependencies = [('appointments', '0001_initial')]
    operations = [
        migrations.CreateModel(
            name='VideoSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('provider', models.CharField(choices=[('daily','Daily.co'),('jitsi','Jitsi Meet'),('whereby','Whereby')], default='jitsi', max_length=20)),
                ('status', models.CharField(choices=[('pending','Pending'),('active','Active'),('ended','Ended'),('cancelled','Cancelled')], default='pending', max_length=20)),
                ('room_name', models.CharField(blank=True, max_length=255)),
                ('room_url', models.URLField(blank=True)),
                ('doctor_token', models.TextField(blank=True)),
                ('patient_token', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('duration_minutes', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('appointment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='video_session', to='appointments.appointment')),
            ],
            options={'ordering': ['-created_at'], 'verbose_name': 'Video Session'},
        ),
    ]

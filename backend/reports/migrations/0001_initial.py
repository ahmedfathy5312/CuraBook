from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(
                    max_length=50,
                    choices=[
                        ('APPOINTMENT', 'Appointment Summary'),
                        ('PRESCRIPTION', 'Prescription List'),
                        ('MEDICAL_HISTORY', 'Medical History'),
                        ('BILLING', 'Billing Statement'),
                    ]
                )),
                ('name', models.CharField(max_length=255)),
                ('file', models.FileField(blank=True, null=True, upload_to='reports/')),
                ('size', models.CharField(max_length=50, blank=True)),
                ('icon', models.CharField(max_length=50, default='📊')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='medical_reports',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'app_label': 'reports',
            },
        ),
    ]

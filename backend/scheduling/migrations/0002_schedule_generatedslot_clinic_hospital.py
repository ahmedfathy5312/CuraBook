import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0001_initial'),
        ('clinics',    '0002_clinicassistant'),
        ('hospital',   '0002_hospitalassistant'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Create Schedule model
        migrations.CreateModel(
            name='Schedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('day_of_week', models.IntegerField(choices=[
                    (0, 'Saturday'), (1, 'Sunday'), (2, 'Monday'),
                    (3, 'Tuesday'), (4, 'Wednesday'), (5, 'Thursday'), (6, 'Friday')
                ])),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('slot_duration', models.PositiveIntegerField(default=30)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('doctor', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='schedules',
                    to=settings.AUTH_USER_MODEL
                )),
                ('clinic', models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='schedules',
                    to='clinics.clinic'
                )),
                ('hospital', models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='schedules',
                    to='hospital.hospital'
                )),
            ],
            options={'verbose_name': 'Schedule', 'verbose_name_plural': 'Schedules'},
        ),
        migrations.AddConstraint(
            model_name='schedule',
            constraint=models.UniqueConstraint(
                fields=['doctor', 'clinic', 'hospital', 'day_of_week', 'start_time'],
                name='unique_schedule'
            ),
        ),
        migrations.AddIndex(
            model_name='schedule',
            index=models.Index(fields=['doctor', 'day_of_week'], name='schedule_doctor_day_idx'),
        ),

        # 2. Add clinic, hospital, schedule FK to GeneratedSlot
        migrations.AddField(
            model_name='generatedslot',
            name='clinic',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='slots',
                to='clinics.clinic'
            ),
        ),
        migrations.AddField(
            model_name='generatedslot',
            name='hospital',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='slots',
                to='hospital.hospital'
            ),
        ),
        migrations.AddField(
            model_name='generatedslot',
            name='schedule',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='generated_slots',
                to='scheduling.schedule'
            ),
        ),
        migrations.AddIndex(
            model_name='generatedslot',
            index=models.Index(
                fields=['clinic', 'is_booked', 'is_active'],
                name='slot_clinic_avail_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='generatedslot',
            index=models.Index(
                fields=['hospital', 'is_booked', 'is_active'],
                name='slot_hospital_avail_idx'
            ),
        ),
    ]

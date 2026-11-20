import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0001_initial'),
        ('assistants', '0003_assistantprofile_public_id'),  # FIX: was users_legacy — AssistantProfile now in apps.assistants
    ]

    operations = [
        migrations.CreateModel(
            name='ClinicAssistant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(
                    choices=[('receptionist', 'Receptionist'), ('coordinator', 'Coordinator'), ('supervisor', 'Supervisor')],
                    default='receptionist', max_length=50
                )),
                ('is_active', models.BooleanField(default=True)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('assistant', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='clinic_assignments',
                    to='assistants.assistantprofile'
                )),
                ('clinic', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='assistant_assignments',
                    to='clinics.clinic'
                )),
            ],
            options={
                'verbose_name': 'Clinic Assistant',
                'verbose_name_plural': 'Clinic Assistants',
                'unique_together': {('assistant', 'clinic')},
            },
        ),
        migrations.AddIndex(
            model_name='clinicassistant',
            index=models.Index(fields=['assistant', 'is_active'], name='clinics_cli_assista_idx'),
        ),
        migrations.AddIndex(
            model_name='clinicassistant',
            index=models.Index(fields=['clinic', 'is_active'], name='clinics_cli_clinic_idx'),
        ),
    ]

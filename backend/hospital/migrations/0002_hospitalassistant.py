import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hospital', '0001_initial'),
        ('assistants', '0003_assistantprofile_public_id'),  # FIX: was users_legacy — AssistantProfile now in apps.assistants
    ]

    operations = [
        migrations.CreateModel(
            name='HospitalAssistant',
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
                    related_name='hospital_assignments',
                    to='assistants.assistantprofile'
                )),
                ('hospital', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='assistant_assignments',
                    to='hospital.hospital'
                )),
            ],
            options={
                'verbose_name': 'Hospital Assistant',
                'verbose_name_plural': 'Hospital Assistants',
                'unique_together': {('assistant', 'hospital')},
            },
        ),
        migrations.AddIndex(
            model_name='hospitalassistant',
            index=models.Index(fields=['assistant', 'is_active'], name='hospital_ha_assista_idx'),
        ),
        migrations.AddIndex(
            model_name='hospitalassistant',
            index=models.Index(fields=['hospital', 'is_active'], name='hospital_ha_hospit_idx'),
        ),
    ]

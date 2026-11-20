from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('assistants', '0004_alter_assistantprofile_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssistantShift',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('place_name', models.CharField(max_length=200)),
                ('place_type', models.CharField(default='clinic', max_length=50)),
                ('doctor_name', models.CharField(blank=True, default='', max_length=200)),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('status', models.CharField(
                    choices=[('confirmed', 'مؤكد'), ('vacation', 'إجازة'), ('cancelled', 'ملغى')],
                    default='confirmed', max_length=20,
                )),
                ('assistant', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='shifts',
                    to='assistants.assistantprofile',
                )),
            ],
            options={
                'verbose_name': 'Assistant Shift',
                'verbose_name_plural': 'Assistant Shifts',
                'ordering': ['date', 'start_time'],
            },
        ),
    ]

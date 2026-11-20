# Generated migration — add SoftDelete + timestamps to DoctorProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctors', '0003_doctor_rating_fee_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctorprofile',
            name='is_deleted',
            field=models.BooleanField(
                default=False, db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='doctorprofile',
            name='deleted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='doctorprofile',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='doctorprofile',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

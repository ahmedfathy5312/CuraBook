# Generated migration — add timestamps to PatientProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='patientprofile',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='patientprofile',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

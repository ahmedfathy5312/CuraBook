from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='doctor_name',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
    ]

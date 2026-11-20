"""
CuraBook — Clinic Geo Coordinates + Pricing
Adds: city, latitude, longitude, consultation_price
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0003_clinic_soft_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='clinic',
            name='city',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='clinic',
            name='latitude',
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9, null=True,
                help_text='GPS latitude (e.g. 30.044420)'
            ),
        ),
        migrations.AddField(
            model_name='clinic',
            name='longitude',
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9, null=True,
                help_text='GPS longitude (e.g. 31.235712)'
            ),
        ),
        migrations.AddField(
            model_name='clinic',
            name='consultation_price',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True,
                help_text='Consultation price at this clinic'
            ),
        ),
        migrations.AddIndex(
            model_name='clinic',
            index=models.Index(fields=['city'], name='clinics_city_idx'),
        ),
    ]

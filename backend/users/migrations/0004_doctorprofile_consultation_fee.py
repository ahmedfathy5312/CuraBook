"""
Add consultation_fee to DoctorProfile.
Enables price-based filtering in doctor search.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users_legacy', '0003_fix_assistantprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctorprofile',
            name='consultation_fee',
            field=models.DecimalField(
                max_digits=8, decimal_places=2,
                null=True, blank=True,
                help_text='Consultation fee in local currency (used for price filter in search)',
            ),
        ),
    ]

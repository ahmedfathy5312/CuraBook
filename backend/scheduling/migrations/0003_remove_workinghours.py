"""
Remove deprecated WorkingHours model.
All scheduling now uses Schedule + GeneratedSlot.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0002_schedule_generatedslot_clinic_hospital'),
    ]

    operations = [
        migrations.DeleteModel(
            name='WorkingHours',
        ),
    ]

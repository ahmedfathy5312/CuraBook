"""
Data migration: Convert User rows with phone='' to phone=NULL
phone is unique=True, null=True — empty string causes unique IntegrityError
"""
from django.db import migrations


def fix_empty_phones(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(phone='').update(phone=None)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(fix_empty_phones, migrations.RunPython.noop),
    ]

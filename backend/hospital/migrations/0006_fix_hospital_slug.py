"""
Migration: Add null=True to Hospital.slug + fix existing empty slug rows
"""
from django.db import migrations, models
from django.utils.text import slugify


def fix_hospital_slugs(apps, schema_editor):
    Hospital = apps.get_model('hospital', 'Hospital')
    used = set(
        Hospital.objects.exclude(slug='').exclude(slug=None)
        .values_list('slug', flat=True)
    )
    for hospital in Hospital.objects.filter(slug__in=['', None]):
        base = slugify(hospital.name) or f"hospital-{hospital.pk}"
        slug = base
        counter = 1
        while slug in used:
            slug = f"{base}-{counter}"
            counter += 1
        used.add(slug)
        hospital.slug = slug
        hospital.save(update_fields=['slug'])


class Migration(migrations.Migration):
    dependencies = [
        ('hospital', '0005_hospital_public_id'),
    ]
    operations = [
        migrations.AlterField(
            model_name='hospital',
            name='slug',
            field=models.SlugField(unique=True, blank=True, null=True),
        ),
        migrations.RunPython(fix_hospital_slugs, migrations.RunPython.noop),
    ]

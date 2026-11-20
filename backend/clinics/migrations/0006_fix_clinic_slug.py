"""
Migration: 
  1. Add null=True to Clinic.slug (safe — unique NULLs are allowed in PostgreSQL)
  2. Data migration: fix existing rows with slug=''
"""
from django.db import migrations, models
from django.utils.text import slugify


def fix_clinic_slugs(apps, schema_editor):
    Clinic = apps.get_model('clinics', 'Clinic')
    used = set(
        Clinic.objects.exclude(slug='').exclude(slug=None)
        .values_list('slug', flat=True)
    )
    broken = Clinic.objects.filter(slug__in=['', None])
    for clinic in broken:
        try:
            raw = clinic.name or clinic.owner.user.username or f"clinic-{clinic.pk}"
        except Exception:
            raw = f"clinic-{clinic.pk}"
        base = slugify(raw) or f"clinic-{clinic.pk}"
        slug = base
        counter = 1
        while slug in used:
            slug = f"{base}-{counter}"
            counter += 1
        used.add(slug)
        clinic.slug = slug
        clinic.save(update_fields=['slug'])


class Migration(migrations.Migration):
    dependencies = [
        ('clinics', '0005_clinic_public_id'),
    ]
    operations = [
        # Step 1: allow NULL temporarily so we can clear empty strings
        migrations.AlterField(
            model_name='clinic',
            name='slug',
            field=models.SlugField(unique=True, blank=True, null=True),
        ),
        # Step 2: fix data
        migrations.RunPython(fix_clinic_slugs, migrations.RunPython.noop),
    ]

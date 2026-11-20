"""
Data migration: Fix DoctorProfile rows with slug='' or slug=None
by regenerating their slugs from username.
"""
from django.db import migrations
from django.utils.text import slugify


def fix_doctor_slugs(apps, schema_editor):
    DoctorProfile = apps.get_model('doctors', 'DoctorProfile')
    used = set(
        DoctorProfile.objects.exclude(slug='').exclude(slug=None)
        .values_list('slug', flat=True)
    )
    broken = DoctorProfile.objects.filter(slug__in=['', None])
    for profile in broken:
        try:
            raw = profile.user.full_name or profile.user.username or f"doctor-{profile.pk}"
        except Exception:
            raw = f"doctor-{profile.pk}"
        base = slugify(raw) or f"doctor-{profile.pk}"
        slug = base
        counter = 1
        while slug in used:
            slug = f"{base}-{counter}"
            counter += 1
        used.add(slug)
        profile.slug = slug
        profile.save(update_fields=['slug'])


class Migration(migrations.Migration):
    dependencies = [
        ('doctors', '0005_doctorprofile_public_id'),
    ]
    operations = [
        migrations.RunPython(fix_doctor_slugs, migrations.RunPython.noop),
    ]

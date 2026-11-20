"""
CuraBook v30 — API-M07
Add is_anonymous BooleanField to Review model.
Allows patients to hide their identity on public-facing review display.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0004_merge_review_migrations'),  # FIX: was 0005, must come after the merge
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_anonymous',
            field=models.BooleanField(
                default=False,
                help_text='If True, patient name is hidden from public review display.',
            ),
        ),
    ]

"""
CuraBook — Reviews: Final Merge
Merges the points from 0004 (index merge) and 0006 (is_anonymous feature).
Resolves: Conflicting migrations detected; multiple leaf nodes.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0004_merge_review_migrations'),
        ('reviews', '0006_review_is_anonymous'),
    ]

    operations = [
    ]

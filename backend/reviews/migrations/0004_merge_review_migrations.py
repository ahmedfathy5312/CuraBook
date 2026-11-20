"""
CuraBook — Reviews: Merge migration

Resolves conflict between two leaf nodes:
  - 0005_review_indexes_legacy  (old branch, renamed from 0002_review_indexes)
  - 0003_review_indexes          (new branch after 0002_review_soft_delete)

Both branches originate from 0001_initial. This merge joins them.
The idx_reviews_doctor_rating index uses CREATE INDEX IF NOT EXISTS — idempotent.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0005_review_indexes_legacy'),  # old branch (renamed)
        ('reviews', '0003_review_indexes'),           # new branch
    ]

    operations = [
        # No operations — both branches create the same index with IF NOT EXISTS
        # This migration just merges the two graph branches into a single leaf
    ]

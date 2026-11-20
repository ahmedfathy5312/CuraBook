"""
CuraBook — Reviews: Performance index (legacy branch — renamed from 0002_review_indexes)

This file was renamed from 0002_review_indexes.py to 0005_review_indexes_legacy.py
to resolve the MigrationConflictError caused by two files sharing the 0002 prefix.

FIX (V14): Changed dependency from 0001_initial → 0002_review_soft_delete so that
the `is_deleted` column exists before any partial index referencing it is created.
Operations cleared — 0003_review_indexes already creates idx_reviews_doctor_rating
with CREATE INDEX CONCURRENTLY IF NOT EXISTS after 0002 runs, so this branch
is a no-op. The 0004_merge migration unifies both branches.
"""

from django.db import migrations


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ('reviews', '0002_review_soft_delete'),  # FIX: was '0001_initial' — is_deleted didn't exist yet
    ]

    operations = [
        # No-op: idx_reviews_doctor_rating is created correctly in 0003_review_indexes
        # (which depends on 0002_review_soft_delete, so is_deleted already exists there).
        # Keeping operations empty avoids duplicate-index errors and the missing-column crash.
    ]

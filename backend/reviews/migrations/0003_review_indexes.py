"""
CuraBook — Reviews: Add performance index for avg_rating annotation

Moved here from doctors/0003 to break circular dependency:
  doctors.0003 → reviews.0001 → appointments.0001 → clinics.0001 → doctors.0006 → CYCLE

This migration runs AFTER reviews.0001 and independently of the doctors chain.
"""

from django.db import migrations


class Migration(migrations.Migration):

    atomic = False  # Required: CREATE INDEX CONCURRENTLY cannot run inside a transaction

    dependencies = [
        ('reviews', '0002_review_soft_delete'),
    ]

    operations = [
        # Index on reviews to speed up avg_rating annotation query
        # avg_rating = Avg('doctor_reviews__rating') — joins on reviews_review (doctor_id, rating)
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_reviews_doctor_rating
            ON reviews_review (doctor_id, rating);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_reviews_doctor_rating;",
        ),
    ]

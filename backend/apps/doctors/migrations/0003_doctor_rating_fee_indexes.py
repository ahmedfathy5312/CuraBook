"""
CuraBook — DoctorProfile: Add consultation_fee and performance indexes
====================================================================
Improves search/sort performance when filtering by price and specialty.

NOTE: avg_rating is a Django annotation (computed via Avg aggregation on reviews),
NOT a real database column. We index the reviews table instead to speed up
the annotation query. The consultation_fee and specialty columns ARE real.
"""

from django.db import migrations


class Migration(migrations.Migration):

    atomic = False  # Required: CREATE INDEX CONCURRENTLY cannot run inside a transaction

    dependencies = [
        ("doctors", "0002_doctorprofile_extra_fields"),
        # NOTE: reviews dependency removed — was causing circular dependency:
        # doctors.0003 → reviews.0001 → appointments.0001 → clinics.0001 → doctors.0006 → doctors.0003
        # The idx_reviews_doctor_rating index is now created in reviews/0002_review_indexes.py
    ]

    operations = [
        # consultation_fee index — for max_fee / min_fee price filter
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_doctors_consultation_fee
            ON doctors_doctorprofile (consultation_fee)
            WHERE consultation_fee IS NOT NULL;
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_doctors_consultation_fee;",
        ),

        # specialty index for active doctors (most common search filter)
        # avg_rating is an annotation — cannot be indexed directly on this table
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_doctors_specialty_booking
            ON doctors_doctorprofile (specialty)
            WHERE accepts_booking = TRUE;
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_doctors_specialty_booking;",
        ),

        # NOTE: idx_reviews_doctor_rating moved to reviews/0002_review_indexes.py
        # to avoid circular dependency with reviews app.
    ]

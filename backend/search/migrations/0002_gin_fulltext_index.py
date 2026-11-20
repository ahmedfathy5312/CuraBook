"""
CuraBook — Search: PostgreSQL GIN Full-Text Index
===================================================
Adds a GIN index on DoctorProfile for fast full-text search.
Covers: full_name, specialty, bio

Improves search from O(n) table scan → O(log n) GIN lookup.
"""

from django.db import migrations


class Migration(migrations.Migration):

    atomic = False  # Required: CREATE INDEX CONCURRENTLY cannot run inside a transaction

    dependencies = [
        ("search", "0001_initial"),
        ("doctors", "0001_initial"),
    ]

    operations = [
        # GIN index on specialty for fast specialty filter
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_doctors_specialty_gin
            ON doctors_doctorprofile
            USING gin(to_tsvector('simple', coalesce(specialty, '')));
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_doctors_specialty_gin;
            """,
            hints={"statement_timeout": 0},
        ),

        # GIN index on user full_name for fast name search
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_accounts_user_fullname_gin
            ON accounts_user
            USING gin(to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(username, '')));
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_accounts_user_fullname_gin;
            """,
            hints={"statement_timeout": 0},
        ),

        # B-tree index on specialty (equality + prefix match)
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_doctors_specialty_btree
            ON doctors_doctorprofile (specialty);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_doctors_specialty_btree;
            """,
        ),

        # Partial index: only active doctors who accept booking
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_doctors_active_accepting
            ON doctors_doctorprofile (user_id, consultation_fee)
            WHERE accepts_booking = TRUE;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS idx_doctors_active_accepting;
            """,
        ),
    ]

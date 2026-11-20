"""
CuraBook — Appointments: Critical Performance Indexes  (FIX B-07)
==================================================================
The audit identified three high-traffic query patterns that had no
composite indexes, causing full-table scans on every patient/doctor
dashboard load:

  1. (patient_id, status)           — "My Appointments" page
  2. (doctor_id, status, slot_id)   — Doctor dashboard appointment list
  3. (hospital_id, created_at)      — Hospital admin overview

These indexes are created with CONCURRENTLY so they do not lock the
table in production.  The migration is therefore non-atomic.
"""

from django.db import migrations


class Migration(migrations.Migration):

    # Non-atomic: CREATE INDEX CONCURRENTLY cannot run inside a transaction
    atomic = False

    dependencies = [
        ("appointments", "0009_appointment_no_show_status"),
    ]

    operations = [
        # ── Index 1: Patient "My Appointments" query ──────────────────────────
        # Pattern: WHERE patient_id = %s AND status IN (...)
        # Used by: AppointmentsPage, PatientDashboard appointment cards
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_patient_status
            ON appointments_appointment (patient_id, status)
            WHERE is_deleted = FALSE;
            """,
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_appt_patient_status;",
        ),

        # ── Index 2: Doctor dashboard — upcoming appointments ─────────────────
        # Pattern: WHERE doctor_id = %s AND status IN ('PENDING','CONFIRMED')
        # ORDER BY slot__start ASC
        # Used by: DoctorDashboard, DoctorAppointmentsPage
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_doctor_status_slot
            ON appointments_appointment (doctor_id, status, slot_id)
            WHERE is_deleted = FALSE
              AND status IN ('PENDING', 'CONFIRMED', 'COMPLETED');
            """,
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_appt_doctor_status_slot;",
        ),

        # ── Index 3: Hospital admin overview — appointments by date ───────────
        # Pattern: WHERE hospital_id = %s ORDER BY created_at DESC
        # Used by: HospitalDashboard overview tab, ManagePatientsPage
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_hospital_created
            ON appointments_appointment (hospital_id, created_at DESC)
            WHERE is_deleted = FALSE;
            """,
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_appt_hospital_created;",
        ),

        # ── Index 4: Clinic-scoped appointment lookup ─────────────────────────
        # Pattern: WHERE clinic_id = %s AND status = %s
        # Used by: AssistantDashboard unified view (multi-clinic)
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_appt_clinic_status
            ON appointments_appointment (clinic_id, status)
            WHERE is_deleted = FALSE AND clinic_id IS NOT NULL;
            """,
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_appt_clinic_status;",
        ),
    ]

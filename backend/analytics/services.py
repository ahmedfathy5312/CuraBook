from django.utils.timezone import now
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError
from datetime import timedelta

from appointments.models import Appointment, AppointmentHistory
from scheduling.models import GeneratedSlot
from notifications.services import send_notification
from hospital.models import Hospital
from clinics.models import Clinic
from notifications.models import Notification
from search.models import SearchLog
from django.contrib.auth import get_user_model
from apps.doctors.models import DoctorProfile
from apps.patients.models import PatientProfile
User = get_user_model()

User = get_user_model()

# =====================================================
# GLOBAL ANALYTICS (ADMIN)
# =====================================================
def get_global_analytics():
    """
    Analytics across the entire platform
    """
    return {
        # ========================
        # Users
        # ========================
        "total_users": User.objects.filter(is_deleted=False).count(),
        "total_patients": User.objects.filter(
            Q(role="patient") |
            Q(is_patient=True) |
            Q(patient_profile__isnull=False)
        ).distinct().count(),
        "total_doctors": User.objects.filter(
            Q(role="doctor") |
            Q(is_doctor=True) |
            Q(doctor_profile__isnull=False)
        ).distinct().count(),

        # ========================
        # Facilities
        # ========================
        "total_hospitals": Hospital.objects.count(),
        "total_clinics": Clinic.objects.count(),

        # ========================
        # Appointments
        # ========================
        "total_appointments": Appointment.objects.count(),
        "accepted_appointments": Appointment.objects.filter(status="ACCEPTED").count(),
        "rejected_appointments": Appointment.objects.filter(status="REJECTED").count(),
        "pending_appointments": Appointment.objects.filter(status="PENDING").count(),
        "cancelled_appointments": Appointment.objects.filter(status="CANCELLED").count(),

        # ========================
        # Notifications
        # ========================
        "total_notifications": Notification.objects.count(),
        "unread_notifications": Notification.objects.filter(is_read=False).count(),

        # ========================
        # Search
        # ========================
        "total_searches": SearchLog.objects.count(),
    }

# =====================================================
# DOCTOR ANALYTICS
# =====================================================
def get_doctor_analytics(doctor_user):
    today = now().date()

    return {
        "doctor_id": doctor_user.id,
        "doctor_name": doctor_user.get_full_name(),

        # Patients
        "total_patients": Appointment.objects.filter(
            doctor=doctor_user
        ).values("patient").distinct().count(),

        # Appointments
        "total_appointments": Appointment.objects.filter(doctor=doctor_user).count(),
        "accepted_appointments": Appointment.objects.filter(
            doctor=doctor_user, status="ACCEPTED"
        ).count(),
        "rejected_appointments": Appointment.objects.filter(
            doctor=doctor_user, status="REJECTED"
        ).count(),
        "cancelled_appointments": Appointment.objects.filter(
            doctor=doctor_user, status="CANCELLED"
        ).count(),
        "today_appointments": Appointment.objects.filter(
            doctor=doctor_user, date=today
        ).count(),
        "upcoming_appointments": Appointment.objects.filter(
            doctor=doctor_user,
            status="ACCEPTED",
            date__gt=today
        ).count(),

        # Notifications
        "unread_notifications": Notification.objects.filter(
            user=doctor_user, is_read=False
        ).count(),
    }

# =====================================================
# HOSPITAL ANALYTICS
# =====================================================
def get_hospital_analytics(hospital):
    today = now().date()

    return {
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,

        # Structure
        "total_doctors": hospital.doctors.count(),
        "total_clinics": hospital.clinics.count(),

        # Appointments
        "total_appointments": Appointment.objects.filter(clinic__hospital=hospital).count(),
        "accepted_appointments": Appointment.objects.filter(clinic__hospital=hospital, status="ACCEPTED").count(),
        "rejected_appointments": Appointment.objects.filter(clinic__hospital=hospital, status="REJECTED").count(),
        "pending_appointments": Appointment.objects.filter(clinic__hospital=hospital, status="PENDING").count(),
        "cancelled_appointments": Appointment.objects.filter(clinic__hospital=hospital, status="CANCELLED").count(),
        "today_appointments": Appointment.objects.filter(clinic__hospital=hospital, date=today).count(),
    }


# =====================================================
# APPOINTMENT SERVICES
# =====================================================

# -----------------------------
# Create Appointment
# -----------------------------
@transaction.atomic
def create_appointment(patient, doctor, slot: GeneratedSlot, reason=None):
    if slot.is_booked:
        raise ValidationError("This slot is already booked.")
    if slot.start < now():
        raise ValidationError("Cannot book an appointment in the past.")
    if slot.doctor_id != doctor.id:
        raise ValidationError("This slot does not belong to this doctor.")

    appointment = Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        slot=slot,
        reason=reason,
        status=Appointment.Status.PENDING,
        expires_at=now() + timedelta(minutes=15)
    )

    slot.is_booked = True
    slot.save(update_fields=['is_booked'])

    AppointmentHistory.objects.create(
        appointment=appointment,
        old_status='',
        new_status=Appointment.Status.PENDING,
        changed_by=patient,
        note="New booking request"
    )

    # Notify doctor and hospital admin
    doctor_user = doctor.user
    hospital_user = getattr(slot.clinic.hospital, 'admin_user', None) if hasattr(slot.clinic, 'hospital') else None

    send_notification(doctor_user, "New appointment request", f"You have a new appointment request from patient {patient.username}.")
    if hospital_user:
        send_notification(hospital_user, "New appointment request",
                          f"A booking request was submitted for patient {patient.username} with Dr. {doctor_user.get_full_name()}.")

    return appointment


# -----------------------------
# Change Appointment Status
# -----------------------------
@transaction.atomic
def change_status(appointment: Appointment, new_status: str, user, note: str = None):
    if appointment.status == new_status:
        return appointment

    old_status = appointment.status
    appointment.status = new_status
    appointment.save(update_fields=['status'])

    AppointmentHistory.objects.create(
        appointment=appointment,
        old_status=old_status,
        new_status=new_status,
        changed_by=user,
        note=note
    )

    # Notifications
    patient = appointment.patient
    doctor = appointment.doctor
    hospital_user = getattr(appointment.slot.clinic.hospital, 'admin_user', None) if hasattr(appointment.slot.clinic, 'hospital') else None

    status_messages = {
        'CONFIRMED': "Your appointment has been confirmed.",
        'REJECTED': "Your appointment has been rejected.",
        'CANCELLED': "Your appointment has been cancelled.",
        'COMPLETED': "Your appointment has been completed."
    }

    if new_status in status_messages:
        send_notification(patient, "Appointment status update",
                          f"{status_messages[new_status]} with Dr. {doctor.full_name or doctor.username}.")
        send_notification(doctor.user, "Appointment status update",
                          f"Your appointment status with patient {patient.username} to {new_status.lower()}.")
        if hospital_user:
            send_notification(hospital_user, "Booking status update",
                              f"Appointment status changed for patient {patient.username} with Dr. {doctor.full_name or doctor.username} to {new_status.lower()}.")

    return appointment


# -----------------------------
# Confirm Appointment
# -----------------------------
@transaction.atomic
def confirm_appointment(appointment: Appointment, user):
    if appointment.status != Appointment.Status.PENDING:
        raise ValidationError("Only PENDING appointments can be confirmed.")
    doctor_user = appointment.doctor
    hospital_admin = getattr(appointment.slot.clinic.hospital, 'admin_user', None)
    if user != doctor_user and user != hospital_admin:
        raise ValidationError("You do not have permission to confirm this appointment.")
    return change_status(appointment, Appointment.Status.CONFIRMED, user, note="Appointment confirmed")


# -----------------------------
# Reject Appointment
# -----------------------------
@transaction.atomic
def reject_appointment(appointment: Appointment, user, reason=None):
    if appointment.status != Appointment.Status.PENDING:
        raise ValidationError("Only PENDING appointments can be rejected.")
    doctor_user = appointment.doctor
    hospital_admin = getattr(appointment.slot.clinic.hospital, 'admin_user', None)
    if user != doctor_user and user != hospital_admin:
        raise ValidationError("You do not have permission to reject this appointment.")

    # Release slot
    appointment.slot.is_booked = False
    appointment.slot.save(update_fields=['is_booked'])

    return change_status(appointment, Appointment.Status.REJECTED, user, note=f"Appointment rejected. {reason or ''}")


# -----------------------------
# Cancel Appointment
# -----------------------------
@transaction.atomic
def cancel_appointment(appointment: Appointment, user):
    if not appointment.can_be_cancelled():
        raise ValidationError("This appointment cannot be cancelled.")
    appointment.slot.is_booked = False
    appointment.slot.save(update_fields=['is_booked'])
    return change_status(appointment, Appointment.Status.CANCELLED, user, note="Appointment cancelled")


# -----------------------------
# Complete Appointment
# -----------------------------
@transaction.atomic
def complete_appointment(appointment: Appointment, user):
    if appointment.status != Appointment.Status.CONFIRMED:
        raise ValidationError("Only CONFIRMED appointments can be completed.")
    return change_status(appointment, Appointment.Status.COMPLETED, user, note="Appointment completed")


# -----------------------------
# Check Expired Appointment
# -----------------------------
def check_expired(appointment: Appointment):
    if appointment.is_expired() and appointment.status == Appointment.Status.PENDING:
        appointment.slot.is_booked = False
        appointment.slot.save(update_fields=['is_booked'])
        appointment.status = Appointment.Status.CANCELLED
        appointment.save(update_fields=['status'])
        AppointmentHistory.objects.create(
            appointment=appointment,
            old_status=Appointment.Status.PENDING,
            new_status=Appointment.Status.CANCELLED,
            changed_by=None,
            note="Appointment request expired automatically"
        )
    return appointment


# -----------------------------
# Send Reminder 24h Before Appointment
# -----------------------------
def send_appointment_reminder(appointment: Appointment):
    if appointment.status != Appointment.Status.CONFIRMED:
        return
    reminder_time = appointment.slot.start - timedelta(hours=24)
    if now() >= reminder_time:
        send_notification(
            appointment.patient,
            "Appointment reminder for tomorrow",
            f"Reminder: You have an appointment with Dr. {appointment.doctor.full_name or appointment.doctor.username} on {appointment.slot.start.strftime('%Y-%m-%d %H:%M')}."
        )

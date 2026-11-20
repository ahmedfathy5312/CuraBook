from django.db import transaction
from .models import Review
from appointments.models import Appointment
from notifications.services import send_notification

@transaction.atomic
def create_review(appointment: Appointment, rating: int, comment: str = '') -> Review:
    """
    Creates a new review after appointment completion.
    Only allowed if the appointment is COMPLETED and not yet reviewed.
    """
    if appointment.status != Appointment.Status.COMPLETED:
        raise ValueError("A review can only be created for a completed appointment.")
    
    if hasattr(appointment, 'review'):
        raise ValueError("A review has already been submitted for this appointment.")

    review = Review.objects.create(
        appointment=appointment,
        rating=rating,
        comment=comment
    )

    # Notify doctor and hospital
    doctor_user = appointment.doctor
    hospital_user = getattr(appointment.slot.clinic.hospital, 'admin_user', None) if hasattr(appointment.slot.clinic, 'hospital') else None

    send_notification(
        doctor_user,
        "New review received",
        f"You have a new review from patient {appointment.patient.username} with a rating of {rating} stars."
    )
    if hospital_user:
        send_notification(
            hospital_user,
            "New review received",
            f"A new review was received from patient {appointment.patient.username} for Dr. {doctor_user.get_full_name()}."
        )

    return review

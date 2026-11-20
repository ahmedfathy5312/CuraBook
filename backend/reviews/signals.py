from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Review
from notifications.services import send_notification

@receiver(post_save, sender=Review)
def notify_review_created(sender, instance: Review, created, **kwargs):
    if created:
        doctor_user = instance.doctor
        patient_user = instance.patient
        send_notification(
            doctor_user,
            "New Review Received",
            f"You have a new {instance.rating}-star review from patient {patient_user.username}."
        )

    # Invalidate doctor search cache when rating changes
    # (avg_rating is annotated in search results — must stay fresh)
    try:
        from search.services import invalidate_doctor_search_cache
        invalidate_doctor_search_cache(doctor_user=instance.doctor)
    except Exception:
        pass

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DoctorProfile


@receiver(post_save, sender=DoctorProfile)
def on_doctor_profile_save(sender, instance, created, **kwargs):
    """Invalidate doctor search cache whenever a DoctorProfile changes."""
    try:
        from search.services import invalidate_doctor_search_cache
        invalidate_doctor_search_cache(doctor_user=instance.user)
    except Exception:
        pass

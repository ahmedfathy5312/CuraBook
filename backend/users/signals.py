"""
CuraBook — Users Signals (UPDATED)
====================================
Added:
  - search cache invalidation on DoctorProfile save/change
  - Proper profile auto-creation
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, DoctorProfile, PatientProfile, AssistantProfile


@receiver(post_save, sender=User)
def create_or_update_profiles(sender, instance, created, **kwargs):
    """Auto-create profiles on user creation. Invalidate search cache on update."""
    if created:
        if instance.is_doctor:
            DoctorProfile.objects.get_or_create(user=instance)
        if instance.is_patient:
            PatientProfile.objects.get_or_create(user=instance)
        if instance.is_assistant:
            AssistantProfile.objects.get_or_create(user=instance)
    else:
        # Propagate save to sub-profiles
        if hasattr(instance, 'doctor_profile'):
            instance.doctor_profile.save()
        if hasattr(instance, 'patient_profile'):
            instance.patient_profile.save()
        if hasattr(instance, 'assistant_profile'):
            instance.assistant_profile.save()

        # ✅ FIX: Invalidate doctor search cache when user data changes
        if instance.is_doctor:
            try:
                from search.services import invalidate_doctor_search_cache
                invalidate_doctor_search_cache(doctor_user=instance)
            except Exception:
                pass


@receiver(post_save, sender=DoctorProfile)
def on_doctor_profile_save(sender, instance, created, **kwargs):
    """
    Invalidate doctor search cache whenever a DoctorProfile changes.
    Called on: specialty update, bio update, accepts_booking toggle, etc.
    """
    try:
        from search.services import invalidate_doctor_search_cache
        invalidate_doctor_search_cache(doctor_user=instance.user)
    except Exception:
        pass

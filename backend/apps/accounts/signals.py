"""
CuraBook — Accounts Signals
============================
Auto-create domain profiles on User creation.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger("curabook")

User = settings.AUTH_USER_MODEL


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def auto_create_domain_profiles(sender, instance, created, **kwargs):
    """
    When a new User is created, auto-create the appropriate domain profile.
    Domain separation: each profile is now in its own app.
    """
    if not created:
        # Invalidate doctor search cache on any update
        if instance.is_doctor:
            try:
                from search.services import invalidate_doctor_search_cache
                invalidate_doctor_search_cache(doctor_user=instance)
            except Exception:
                pass
        return

    if instance.is_doctor:
        try:
            from apps.doctors.models import DoctorProfile
            DoctorProfile.objects.get_or_create(user=instance)
        except Exception as e:
            logger.warning(f"[Accounts] DoctorProfile auto-create failed: {e}")

    if instance.is_patient:
        try:
            from apps.patients.models import PatientProfile
            PatientProfile.objects.get_or_create(user=instance)
        except Exception as e:
            logger.warning(f"[Accounts] PatientProfile auto-create failed: {e}")

    if instance.is_assistant:
        try:
            from apps.assistants.models import AssistantProfile
            AssistantProfile.objects.get_or_create(user=instance)
        except Exception as e:
            logger.warning(f"[Accounts] AssistantProfile auto-create failed: {e}")

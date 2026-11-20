"""
CuraBook — Clinic Signals
===========================
Invalidates search cache when clinic data changes (Bug #17).

Triggers:
  - Clinic saved/updated (name, address, consultation_fee, city, etc.)
  - ClinicAssistant assignment changed

This ensures doctor search results stay fresh when the doctor
updates their consultation fee or clinic changes its address.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender='clinics.Clinic')
def on_clinic_saved(sender, instance, **kwargs):
    """
    Invalidate doctor search cache when a clinic changes.
    The clinic's owning doctor appears in search results — bust their cache.
    """
    try:
        from search.services import invalidate_doctor_search_cache
        # The clinic owner is a DoctorProfile — get their user
        if hasattr(instance, 'owner') and instance.owner:
            invalidate_doctor_search_cache(doctor_user=instance.owner.user)
        else:
            # Invalidate entire search cache version (safe fallback)
            invalidate_doctor_search_cache()
    except Exception:
        pass  # Never crash on signal failure


@receiver(post_save, sender='clinics.ClinicAssistant')
@receiver(post_delete, sender='clinics.ClinicAssistant')
def on_clinic_assistant_changed(sender, instance, **kwargs):
    """
    Bust assistant dashboard cache when assignments change.
    """
    try:
        from dashboard.selectors import invalidate_dashboard_cache
        if hasattr(instance, 'assistant') and instance.assistant:
            invalidate_dashboard_cache(user=instance.assistant.user)
    except Exception:
        pass

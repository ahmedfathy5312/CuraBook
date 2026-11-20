"""
CuraBook — Scheduling Signals
When a Schedule is saved/deleted → trigger slot generation/cleanup.
WorkingHours was removed in migration 0003.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Schedule, GeneratedSlot


@receiver(post_save, sender=Schedule)
def on_schedule_saved(sender, instance, created, **kwargs):
    """
    When a Schedule is deactivated, deactivate its unbooked generated slots.
    When created, slots are generated on-demand (not auto-generated here
    to avoid blocking the request — use the /generate-slots/ endpoint).
    """
    if not instance.is_active:
        # Deactivate all future unbooked slots for this schedule
        from django.utils import timezone
        GeneratedSlot.objects.filter(
            schedule=instance,
            is_booked=False,
            start__gte=timezone.now(),
        ).update(is_active=False)


@receiver(post_delete, sender=Schedule)
def on_schedule_deleted(sender, instance, **kwargs):
    """
    When a Schedule is deleted, deactivate all its unbooked future slots.
    """
    from django.utils import timezone
    GeneratedSlot.objects.filter(
        schedule=instance,
        is_booked=False,
        start__gte=timezone.now(),
    ).update(is_active=False)

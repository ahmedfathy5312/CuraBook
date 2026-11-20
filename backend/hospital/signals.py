from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import HospitalAdmin, HospitalDoctor, HospitalStaff
from notifications.services import notify_user


def _notify_user_assignment(instance, title, message_template):
    """
    Shared notification logic
    """
    if not instance.user or not instance.hospital:
        return

    hospital_name = getattr(instance.hospital, 'name', 'Unknown Hospital')
    message = message_template.format(hospital=hospital_name)

    notify_user(
        user=instance.user,
        title=title,
        body=message
    )


# ==================================================
# Notify Doctor when added to Hospital
# ==================================================
@receiver(post_save, sender=HospitalDoctor)
def notify_doctor_added(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return

    _notify_user_assignment(
        instance=instance,
        title="Hospital Assignment",
        message_template="You have been assigned as a doctor to {hospital}."
    )


@receiver(post_save, sender=HospitalDoctor)
@receiver(post_delete, sender=HospitalDoctor)
def invalidate_hospital_doctor_analytics(sender, instance, raw=False, **kwargs):
    if raw or not instance.hospital_id:
        return

    try:
        from analytics.selectors import invalidate_hospital_analytics

        admin_ids = HospitalAdmin.objects.filter(
            hospital_id=instance.hospital_id
        ).values_list('user_id', flat=True)
        for admin_id in admin_ids:
            invalidate_hospital_analytics(admin_id)
    except Exception:
        pass


# ==================================================
# Notify Staff when added to Hospital
# ==================================================
@receiver(post_save, sender=HospitalStaff)
def notify_staff_added(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return

    _notify_user_assignment(
        instance=instance,
        title="Hospital Staff Assignment",
        message_template="You have been added to the staff at {hospital}."
    )

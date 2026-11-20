"""
CuraBook — Analytics Cache Invalidation Signals

Whenever an appointment changes status, we invalidate
the cached dashboard stats for the relevant users.
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .selectors import (
    invalidate_admin_analytics,
    invalidate_user_analytics,
    invalidate_hospital_analytics,
)


@receiver(post_save, sender='appointments.Appointment')
@receiver(post_delete, sender='appointments.Appointment')
def invalidate_on_appointment_change(sender, instance, **kwargs):
    """
    Invalidate cached analytics for:
      - the doctor
      - the patient
      - hospital admin (if hospital appointment)
    """
    try:
        invalidate_admin_analytics()

        # Doctor stats
        if instance.doctor_id:
            invalidate_user_analytics(instance.doctor_id)

        # Patient stats
        if instance.patient_id:
            invalidate_user_analytics(instance.patient_id)

        # Hospital stats
        if instance.hospital_id:
            # Find hospital admins and invalidate their cache
            from hospital.models import HospitalAdmin
            admin_ids = HospitalAdmin.objects.filter(
                hospital_id=instance.hospital_id
            ).values_list('user_id', flat=True)
            for admin_id in admin_ids:
                invalidate_hospital_analytics(admin_id)

    except Exception:
        pass  # Never break main flow


@receiver(post_save, sender='accounts.User')
@receiver(post_delete, sender='accounts.User')
@receiver(post_save, sender='hospital.Hospital')
@receiver(post_delete, sender='hospital.Hospital')
@receiver(post_save, sender='hospital.HospitalDoctor')
@receiver(post_delete, sender='hospital.HospitalDoctor')
@receiver(post_save, sender='clinics.Clinic')
@receiver(post_delete, sender='clinics.Clinic')
def invalidate_admin_analytics_on_platform_change(sender, instance, **kwargs):
    """Keep System Admin analytics in sync with platform entities."""
    try:
        invalidate_admin_analytics()
    except Exception:
        pass

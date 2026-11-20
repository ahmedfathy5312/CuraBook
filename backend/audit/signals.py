"""
CuraBook — Audit Signals
Automatically logs critical model changes.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import user_logged_in, user_logged_out

from .services import log_action
from .models import AuditLog


# ─── Login / Logout ──────────────────────────────
@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    log_action(
        actor=user,
        action=AuditLog.Action.LOGIN,
        request=request,
        metadata={'username': user.username},
    )


@receiver(user_logged_out)
def on_logout(sender, request, user, **kwargs):
    log_action(
        actor=user,
        action=AuditLog.Action.LOGOUT,
        request=request,
    )


# ─── Appointment Status Changes ───────────────────
@receiver(post_save, sender='appointments.Appointment')
def on_appointment_save(sender, instance, created, **kwargs):
    from appointments.models import Appointment

    if created:
        log_action(
            action=AuditLog.Action.BOOKING,
            obj=instance,
            new_data={
                'patient_id': instance.patient_id,
                'doctor_id':  instance.doctor_id,
                'slot_id':    instance.slot_id,
                'status':     instance.status,
            },
            note='New appointment created',
        )
    else:
        status = instance.status
        action_map = {
            Appointment.Status.CONFIRMED: AuditLog.Action.CONFIRM,
            Appointment.Status.REJECTED:  AuditLog.Action.REJECT,
            Appointment.Status.CANCELLED: AuditLog.Action.CANCEL,
            Appointment.Status.COMPLETED: AuditLog.Action.COMPLETE,
        }
        if status in action_map:
            log_action(
                action=action_map[status],
                obj=instance,
                new_data={'status': status},
                note=f'Appointment #{instance.id} → {status}',
            )

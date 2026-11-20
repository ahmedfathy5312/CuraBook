"""
CuraBook — Notification Service

Single entry point for all notifications.
Each notification does 3 things:
  1. Saves to DB (Notification model)
  2. Pushes via WebSocket (Channels group_send)
  3. Queues email via Celery (async)
"""

import logging
from datetime import datetime, date
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification, NotificationPreferences

from django.db import transaction
from django.db.models import Q

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Core — send_notification
# ─────────────────────────────────────────────
def send_notification(
    user,
    title: str,
    body: str,
    notif_type: str = Notification.Type.SYSTEM,
    metadata: dict = None,
    send_email: bool = False,
    email_template: str = None,
    groups: list = None,          # extra channel groups to push to (e.g. clinic_1)
):
    """
    Creates a notification and pushes it in real-time via WebSocket.
    Respects the user's NotificationPreferences — skips channels if opted out.

    Args:
        user:            Target User instance.
        title:           Short notification title.
        body:            Full notification message.
        notif_type:      One of Notification.Type choices.
        metadata:        Extra JSON data (appointment_id, doctor_name, etc.)
        send_email:      If True, queues an email via Celery (subject to prefs).
        email_template:  Email template key (confirmed/rejected/reminder...).
        groups:          Additional channel groups beyond user_{id}.
    """
    if not user:
        return None

    # Load user preferences (creates defaults if missing)
    prefs = NotificationPreferences.for_user(user)

    # Check granular event preference
    _TYPE_TO_PREF = {
        Notification.Type.APPOINTMENT_CONFIRMED: 'notify_on_appointment_confirmed',
        Notification.Type.APPOINTMENT_REJECTED:  'notify_on_appointment_rejected',
        Notification.Type.APPOINTMENT_CANCELLED: 'notify_on_appointment_cancelled',
        Notification.Type.APPOINTMENT_REMINDER:  'notify_on_appointment_reminder',
    }
    pref_attr = _TYPE_TO_PREF.get(notif_type)
    if pref_attr and not getattr(prefs, pref_attr, True):
        logger.debug(f'[Notification] Skipped {notif_type} for {user} — opted out via prefs')
        return None

    metadata = _make_json_safe(metadata or {})
    notification = None
    appointment_id = metadata.get('appointment_id')
    status_key = metadata.get('new_status') or metadata.get('status')
    if status_key:
        status_key = str(status_key).upper()
        if metadata.get('new_status'):
            metadata['new_status'] = status_key
        elif metadata.get('status'):
            metadata['status'] = status_key

    # 1. Save to DB (in-app). Duplicate check and create stay atomic so two
    # near-simultaneous status events cannot create two persistent rows.
    if prefs.in_app_enabled:
        with transaction.atomic():
            if appointment_id and notif_type != Notification.Type.SYSTEM:
                duplicate_qs = Notification.objects.select_for_update().filter(
                    user=user,
                    type=notif_type,
                    metadata__appointment_id=appointment_id,
                )
                if status_key:
                    duplicate_qs = duplicate_qs.filter(
                        Q(metadata__new_status=status_key) | Q(metadata__status=status_key)
                    )
                existing = duplicate_qs.order_by('-created_at').first()
                if existing:
                    return existing

            notification = Notification.objects.create(
                user=user,
                type=notif_type,
                title=title,
                body=body,
                metadata=metadata,
            )

        # 2. Push via WebSocket
        _push_to_websocket(
            groups=[f'user_{user.id}'] + (groups or []),
            payload={
                'type':            notif_type,
                'notification_id': notification.id,
                'title':           title,
                'body':            body,
                'metadata':        notification.metadata,
                'is_read':         False,
                'created_at':      notification.created_at.isoformat(),
            }
        )

    # 3. Queue email (async, non-blocking) — respects email preference
    if send_email and user.email and email_template and prefs.email_enabled:
        from .tasks import send_notification_email
        send_notification_email.delay(
            user_id=user.id,
            title=title,
            body=body,
            template=email_template,
        )

    return notification


# ─────────────────────────────────────────────
# Appointment-specific helpers
# ─────────────────────────────────────────────
def notify_new_appointment(appointment):
    """
    Notifies: doctor + all assistants of the clinic/hospital.
    Called right after appointment is created (PENDING).
    """
    doctor  = appointment.doctor
    patient = appointment.patient
    loc     = appointment.get_location()
    loc_name = getattr(loc, 'name', str(loc))
    doctor_name = doctor.full_name or doctor.username

    meta = {
        'appointment_id': appointment.id,
        'patient_name':   patient.full_name or patient.username,
        'doctor_name':    doctor_name,
        'slot_start':     appointment.slot.start.isoformat(),
        'location':       loc_name,
    }

    # Extra groups: clinic or hospital channel (assistants listening)
    extra_groups = []
    if appointment.clinic_id:
        extra_groups.append(f'clinic_{appointment.clinic_id}')
    if appointment.hospital_id:
        extra_groups.append(f'hospital_{appointment.hospital_id}')

    # Notify doctor
    send_notification(
        user=doctor,
        title='طلب موعد جديد',
        body=f'لديك طلب موعد جديد من المريض {patient.full_name or patient.username}.',
        notif_type=Notification.Type.NEW_APPOINTMENT,
        metadata=meta,
        groups=extra_groups,
    )

    # Notify patient (confirmation that booking was received)
    send_notification(
        user=patient,
        title='تم استلام طلب الحجز',
        body=f'تم إرسال طلب موعدك مع د. {doctor_name} وهو قيد المراجعة.',
        notif_type=Notification.Type.NEW_APPOINTMENT,
        metadata=meta,
    )

    # Hospital dashboards read persisted notifications for the admin user.
    # The hospital_* group push above is only realtime and disappears on refresh.
    for admin_user in _get_hospital_admin_users(appointment):
        send_notification(
            user=admin_user,
            title='طلب موعد جديد',
            body=f'تم استلام طلب موعد جديد للمريض {patient.full_name or patient.username} مع د. {doctor_name}.',
            notif_type=Notification.Type.NEW_APPOINTMENT,
            metadata={**meta, 'hospital_id': appointment.hospital_id},
        )


def notify_appointment_status(appointment, new_status: str):
    """
    Notifies patient (and doctor) when appointment status changes.
    Called after confirm/reject/cancel/complete.
    """
    STATUS_MAP = {
        'CONFIRMED':  (Notification.Type.APPOINTMENT_CONFIRMED, 'تم تأكيد الموعد',   'confirmed'),
        'REJECTED':   (Notification.Type.APPOINTMENT_REJECTED,  'تم رفض الموعد',      'rejected'),
        'CANCELLED':  (Notification.Type.APPOINTMENT_CANCELLED, 'تم إلغاء الموعد',   'cancelled'),
        'COMPLETED':  (Notification.Type.APPOINTMENT_COMPLETED, 'اكتمل الموعد',      None),
    }

    if new_status not in STATUS_MAP:
        return

    notif_type, title, email_tpl = STATUS_MAP[new_status]
    patient     = appointment.patient
    doctor      = appointment.doctor
    doctor_name = doctor.full_name or doctor.username
    loc_name    = getattr(appointment.get_location(), 'name', '')

    meta = {
        'appointment_id': appointment.id,
        'new_status':     new_status,
        'doctor_name':    doctor_name,
        'slot_start':     appointment.slot.start.isoformat(),
        'location':       loc_name,
    }

    # Extra groups: push appointment update to clinic/hospital assistants
    extra_groups = []
    if appointment.clinic_id:
        extra_groups.append(f'clinic_{appointment.clinic_id}')
    if appointment.hospital_id:
        extra_groups.append(f'hospital_{appointment.hospital_id}')

    # ── Map status → frontend event type ──────────────────────────────────
    # Frontend expects: NEW_APPOINTMENT, APPOINTMENT_APPROVED, APPOINTMENT_REJECTED, APPOINTMENT_REMINDER
    # Backend status:   CONFIRMED maps to APPROVED per frontend contract
    WS_EVENT_MAP = {
        'CONFIRMED': 'APPOINTMENT_APPROVED',   # frontend alias
        'REJECTED':  'APPOINTMENT_REJECTED',
        'CANCELLED': 'APPOINTMENT_CANCELLED',
        'COMPLETED': 'APPOINTMENT_COMPLETED',
    }
    ws_event_type = WS_EVENT_MAP.get(new_status, f'APPOINTMENT_{new_status}')

    # ✅ Push appointment_update event to ALL assistant channels directly
    if extra_groups:
        _push_to_websocket(
            groups=extra_groups,
            payload={
                'type':           ws_event_type,
                'appointment_id': appointment.id,
                'new_status':     new_status,
                'doctor_name':    doctor_name,
                'slot_start':     meta['slot_start'],
                'location':       loc_name,
                'patient_name':   patient.full_name or patient.username,
            },
            event_type='appointment_update',
        )

    # Notify patient
    send_notification(
        user=patient,
        title=title,
        body=f'{title} مع د. {doctor_name} في {loc_name}.',
        notif_type=notif_type,
        metadata=meta,
        send_email=bool(email_tpl),
        email_template=email_tpl,
    )

    # Notify doctor
    send_notification(
        user=doctor,
        title='تحديث حالة الموعد',
        body=f'تم تحديث حالة موعدك مع المريض {patient.full_name or patient.username} إلى {new_status}.',
        notif_type=notif_type,
        metadata=meta,
    )

    for admin_user in _get_hospital_admin_users(appointment):
        send_notification(
            user=admin_user,
            title='تحديث حالة الموعد',
            body=f'تم تحديث حالة موعد المريض {patient.full_name or patient.username} مع د. {doctor_name} إلى {new_status}.',
            notif_type=notif_type,
            metadata={
                **meta,
                'hospital_id': appointment.hospital_id,
                'patient_name': patient.full_name or patient.username,
            },
        )


def notify_appointment_reminder(appointment):
    """24h reminder — sent by Celery beat task."""
    patient     = appointment.patient
    doctor_name = appointment.doctor.full_name or appointment.doctor.username
    loc_name    = getattr(appointment.get_location(), 'name', '')
    slot_time   = appointment.slot.start.strftime('%Y-%m-%d %H:%M')

    send_notification(
        user=patient,
        title='تذكير بالموعد',
        body=f'تذكير: لديك موعد مع د. {doctor_name} في {loc_name} بتاريخ {slot_time}.',
        notif_type=Notification.Type.APPOINTMENT_REMINDER,
        metadata={
            'appointment_id': appointment.id,
            'slot_start':     appointment.slot.start.isoformat(),
        },
        send_email=True,
        email_template='reminder',
    )


# ─────────────────────────────────────────────
# Broadcast to group (for assistants dashboard)
# ─────────────────────────────────────────────
def broadcast_to_group(group_name: str, payload: dict):
    """
    Push a raw message to a channel group.
    Useful for broadcasting to clinic_X or hospital_X groups.
    """
    _push_to_websocket(groups=[group_name], payload=payload)


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────
def _push_to_websocket(groups: list, payload: dict, event_type: str = 'notification.message'):
    """Push payload to all given channel groups via Redis channel layer.

    Args:
        groups:     List of channel group names (e.g. ['user_1', 'clinic_5'])
        payload:    Dict to send as JSON to the WebSocket client
        event_type: Django Channels message type ('notification.message' or 'appointment.update')
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning('[WS] No channel layer configured — skipping push')
        return

    # Map event_type to the consumer method name (dots → underscores)
    channel_type = event_type.replace('.', '_')   # 'appointment_update'
    # But channels expects dot-notation type that maps to method name
    type_key = event_type  # e.g. 'notification.message' → calls consumer.notification_message

    for group in groups:
        try:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    'type':    type_key,
                    'payload': payload,
                }
            )
        except Exception as e:
            logger.error(f'[WS] group_send to {group} failed: {e}')


def _make_json_safe(data: dict) -> dict:
    return {
        k: v.isoformat() if isinstance(v, (datetime, date)) else v
        for k, v in data.items()
    }


def _get_hospital_admin_users(appointment):
    if not getattr(appointment, 'hospital_id', None):
        return []

    try:
        return [
            link.user
            for link in appointment.hospital.admins
            .filter(user__isnull=False, user__is_active=True)
            .select_related('user')
        ]
    except Exception as exc:
        logger.error(
            '[Notifications] Failed to resolve hospital admins for appointment=%s hospital=%s: %s',
            getattr(appointment, 'id', None),
            getattr(appointment, 'hospital_id', None),
            exc,
        )
        return []


# ─────────────────────────────────────────────
# Backward compatibility alias
# ─────────────────────────────────────────────
notify_user = send_notification


# ─────────────────────────────────────────────
# Bulk Notifications
# ─────────────────────────────────────────────
def send_bulk_notifications(
    users,
    title: str,
    body: str,
    notif_type: str = Notification.Type.SYSTEM,
    metadata: dict = None,
    groups: list = None,
):
    """
    Send the same notification to multiple users efficiently.

    Instead of N separate DB writes + N separate WebSocket pushes,
    this does:
      1. One bulk_create for all DB records
      2. One group_send per unique channel group

    Args:
        users:      QuerySet or list of User instances.
        title:      Notification title.
        body:       Notification body.
        notif_type: Notification.Type choice.
        metadata:   Shared metadata dict (same for all recipients).
        groups:     Extra channel groups beyond per-user groups (e.g. clinic_1).
    """
    users = list(users)
    if not users:
        return []

    safe_meta = _make_json_safe(metadata or {})

    # ── 1. Bulk DB insert ────────────────────────────────────────────────────
    notifications = Notification.objects.bulk_create([
        Notification(
            user=user,
            type=notif_type,
            title=title,
            body=body,
            metadata=safe_meta,
        )
        for user in users
    ], ignore_conflicts=True)

    # ── 2. WebSocket push — one group_send per user + shared groups ──────────
    channel_layer = get_channel_layer()
    if channel_layer:
        # Build unique groups: per-user channels + any extra shared groups
        all_groups = [f'user_{u.id}' for u in users] + (groups or [])

        payload = {
            'type':       notif_type,
            'title':      title,
            'body':       body,
            'metadata':   safe_meta,
            'is_read':    False,
        }

        for group in all_groups:
            try:
                async_to_sync(channel_layer.group_send)(
                    group,
                    {
                        'type':    'notification.message',
                        'payload': payload,
                    }
                )
            except Exception as e:
                logger.error(f'[WS Bulk] group_send to {group} failed: {e}')

    logger.info(
        f'[Bulk Notification] Sent "{title}" to {len(users)} users '
        f'({len(notifications)} DB records created)'
    )
    return notifications


def notify_schedule_change(doctor, affected_patients, old_slot_info: str, new_slot_info: str = None):
    """
    Notify all patients affected by a doctor schedule change in bulk.
    Classic use case: doctor blocks/changes slots → notify N patients at once.
    """
    if not affected_patients:
        return

    doctor_name = doctor.full_name or doctor.username
    body = (
        f'Your appointment with Dr. {doctor_name} has been rescheduled. '
        f'Previous slot: {old_slot_info}.'
    )
    if new_slot_info:
        body += f' Proposed new slot: {new_slot_info}.'

    send_bulk_notifications(
        users=affected_patients,
        title='Appointment Reschedule Request',
        body=body,
        notif_type=Notification.Type.SYSTEM,
        metadata={'doctor_name': doctor_name, 'old_slot': old_slot_info},
    )


# ─────────────────────────────────────────────
# API-H05 FIX — mark_all_read_for_user
# ─────────────────────────────────────────────

@transaction.atomic
def mark_all_read_for_user(user) -> int:
    """
    Mark all unread notifications for a user as read.

    Uses select_for_update() to prevent race conditions where two
    simultaneous requests could both count the same unread notifications
    and produce inconsistent 'marked_read' counts.

    Returns:
        int — number of notifications actually marked as read.
    """
    # Lock the rows before reading so concurrent calls queue up
    unread_qs = (
        Notification.objects
        .select_for_update()
        .filter(user=user, is_read=False)
    )
    # Collect IDs while holding the lock, then bulk-update
    ids = list(unread_qs.values_list('id', flat=True))
    if not ids:
        return 0

    updated = Notification.objects.filter(id__in=ids).update(is_read=True)
    logger.info('[Notifications] mark_all_read: user=%s marked=%s', user.id, updated)
    return updated

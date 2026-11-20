"""CuraBook — Video Consultation Services"""
import logging
from django.utils import timezone
from .models import VideoSession
from .providers import get_video_provider

logger = logging.getLogger('curabook.video')

TOKEN_TTL = 15 * 60  # 15 minutes — matches providers.create_short_lived_token()


def create_video_session(appointment) -> VideoSession:
    """ينشئ جلسة فيديو لموعد محدد. Tokens are NOT stored."""
    if hasattr(appointment, 'video_session'):
        return appointment.video_session

    provider = get_video_provider()
    import os
    provider_name = os.environ.get('VIDEO_PROVIDER', 'jitsi')

    try:
        room_data = provider.create_room(appointment)
    except Exception as exc:
        logger.error('[Video] Failed to create room for appointment %s: %s', appointment.id, exc)
        from rest_framework.exceptions import ServiceUnavailable
        raise ServiceUnavailable(
            detail={
                'code': 'VIDEO_UNAVAILABLE',
                'message': 'Video service is temporarily unavailable. Please try again later.',
            }
        ) from exc

    # Only room_name and room_url are persisted — no tokens in DB.
    session = VideoSession.objects.create(
        appointment=appointment,
        provider=provider_name,
        status=VideoSession.Status.PENDING,
        room_name=room_data['room_name'],
        room_url=room_data['room_url'],
    )
    logger.info('[Video] Session created: %s (%s)', session.id, provider_name)
    return session


def get_fresh_token(session: VideoSession, *, is_doctor: bool) -> dict:
    """
    Generate a fresh short-lived token for the given session.

    Returns a dict with token, room_url, join_url, and expires_in_seconds.
    Called by the /token/ action — never during session creation.
    """
    token = session.get_token(is_doctor=is_doctor)
    join_url = f'{session.room_url}?t={token}' if token else session.room_url
    return {
        'token':              token,
        'room_url':           session.room_url,
        'join_url':           join_url,
        'expires_in_seconds': TOKEN_TTL,
    }


def start_session(session: VideoSession) -> VideoSession:
    session.status     = VideoSession.Status.ACTIVE
    session.started_at = timezone.now()
    session.save(update_fields=['status', 'started_at', 'updated_at'])
    return session


def end_session(session: VideoSession) -> VideoSession:
    now = timezone.now()
    duration = 0
    if session.started_at:
        duration = int((now - session.started_at).total_seconds() / 60)
    session.status           = VideoSession.Status.ENDED
    session.ended_at         = now
    session.duration_minutes = duration
    session.save(update_fields=['status', 'ended_at', 'duration_minutes', 'updated_at'])
    logger.info('[Video] Session ended: %s (duration: %d min)', session.id, duration)
    return session

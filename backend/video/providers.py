"""
CuraBook — Video Providers
===========================
بيدعم Daily.co (الأفضل)، Jitsi Meet (مجاني/self-hosted)، Whereby.

Env vars:
    VIDEO_PROVIDER=daily | jitsi | whereby

    Daily.co:
        DAILY_API_KEY — مفتاح API من dashboard.daily.co

    Jitsi (self-hosted or meet.jit.si):
        JITSI_DOMAIN  — e.g. meet.jit.si أو jitsi.yourserver.com
        JITSI_SECRET  — للـ JWT tokens (لو مضبوط)

    Whereby:
        WHEREBY_API_KEY
"""

import os
import time
import logging
import uuid
import requests
import json
import hmac
import hashlib
import base64

logger = logging.getLogger('curabook.video')


# ── Daily.co ───────────────────────────────────────────────────────────────────

class DailyProvider:
    """
    Daily.co — أفضل مزود WebRTC للاستشارات الطبية.
    يدعم E2E encryption، مسجّل تلقائي، وقفة أتوماتيك.
    https://docs.daily.co/reference
    """

    BASE_URL = 'https://api.daily.co/v1'

    def __init__(self):
        self.api_key = os.environ.get('DAILY_API_KEY', '')

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type':  'application/json',
        }

    def create_room(self, appointment) -> dict:
        """ينشئ غرفة مؤتمر فيديو جديدة."""
        room_name = f'curabook-{appointment.id}'
        exp = int(time.time()) + 3600  # ساعة واحدة

        payload = {
            'name':       room_name,
            'privacy':    'private',
            'properties': {
                'exp':                      exp,
                'enable_chat':              True,
                'enable_screenshare':       True,
                'enable_recording':         False,
                'start_video_off':          False,
                'start_audio_off':          False,
                'max_participants':         2,
                'enable_knocking':          True,
                'enable_prejoin_ui':        True,
            },
        }

        resp = requests.post(
            f'{self.BASE_URL}/rooms',
            headers=self._headers(),
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        room = resp.json()

        # Generate meeting tokens
        doctor_token  = self._create_token(room_name, is_owner=True,  exp=exp)
        patient_token = self._create_token(room_name, is_owner=False, exp=exp)

        return {
            'room_name':     room_name,
            'room_url':      room.get('url', f'https://curabook.daily.co/{room_name}'),
            'doctor_token':  doctor_token,
            'patient_token': patient_token,
        }

    def _create_token(self, room_name: str, is_owner: bool = False, exp: int = None) -> str:
        """ينشئ JWT token للانضمام للغرفة."""
        exp = exp or (int(time.time()) + 3600)
        payload = {
            'r':   room_name,
            'o':   is_owner,
            'exp': exp,
        }
        resp = requests.post(
            f'{self.BASE_URL}/meeting-tokens',
            headers=self._headers(),
            json={'properties': payload},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get('token', '')

    def create_short_lived_token(self, *, room_name: str, is_moderator: bool) -> str:
        """
        Generate a fresh token valid for TOKEN_TTL seconds (15 min).
        Called on every request — tokens are never stored in the DB.
        """
        TOKEN_TTL = 15 * 60  # 15 minutes
        exp = int(time.time()) + TOKEN_TTL
        return self._create_token(room_name, is_owner=is_moderator, exp=exp)

    def delete_room(self, room_name: str):
        try:
            requests.delete(
                f'{self.BASE_URL}/rooms/{room_name}',
                headers=self._headers(),
                timeout=10,
            )
        except Exception as exc:
            logger.warning('[Daily] Failed to delete room %s: %s', room_name, exc)


# ── Jitsi Meet ─────────────────────────────────────────────────────────────────

class JitsiProvider:
    """
    Jitsi Meet — مجاني ومفتوح المصدر.
    ممكن تستخدم meet.jit.si أو تشيل سيرفر خاص.
    """

    def __init__(self):
        self.domain = os.environ.get('JITSI_DOMAIN', 'meet.jit.si')
        self.secret = os.environ.get('JITSI_SECRET', '')

    def create_room(self, appointment) -> dict:
        room_name = f'curabook-{appointment.id}'
        room_url  = f'https://{self.domain}/{room_name}'

        # JWT tokens لو الـ secret مضبوط
        doctor_token  = self._create_jwt(room_name, is_moderator=True)  if self.secret else ''
        patient_token = self._create_jwt(room_name, is_moderator=False) if self.secret else ''

        return {
            'room_name':     room_name,
            'room_url':      room_url,
            'doctor_token':  doctor_token,
            'patient_token': patient_token,
        }

    def _create_jwt(self, room: str, is_moderator: bool, ttl: int = 3600) -> str:
        """JWT token لـ Jitsi (لو السيرفر مضبوط على JWT auth)."""
        import struct
        header  = base64.urlsafe_b64encode(json.dumps({'alg':'HS256','typ':'JWT'}).encode()).rstrip(b'=')
        payload = base64.urlsafe_b64encode(json.dumps({
            'context': {'user': {'moderator': is_moderator}},
            'aud': 'jitsi',
            'iss': 'curabook',
            'sub': self.domain,
            'room': room,
            'exp': int(time.time()) + ttl,
        }).encode()).rstrip(b'=')
        sig_input = header + b'.' + payload
        sig = base64.urlsafe_b64encode(
            hmac.new(self.secret.encode(), sig_input, hashlib.sha256).digest()
        ).rstrip(b'=')
        return (sig_input + b'.' + sig).decode()

    def create_short_lived_token(self, *, room_name: str, is_moderator: bool) -> str:
        """
        Generate a fresh token valid for TOKEN_TTL seconds (15 min).
        Called on every request — tokens are never stored in the DB.
        Returns empty string if JITSI_SECRET is not configured.
        """
        if not self.secret:
            return ''
        TOKEN_TTL = 15 * 60  # 15 minutes
        return self._create_jwt(room_name, is_moderator=is_moderator, ttl=TOKEN_TTL)

    def delete_room(self, room_name: str):
        pass  # Jitsi rooms expire automatically


# ── Factory ────────────────────────────────────────────────────────────────────

def get_video_provider():
    provider = os.environ.get('VIDEO_PROVIDER', 'jitsi')
    if provider == 'daily':
        return DailyProvider()
    return JitsiProvider()

"""
CuraBook — SMS Integration Module
===================================
Provides a provider-agnostic SMS interface with support for:
  - Twilio (international / global)
  - Vonage / Nexmo (alternative)
  - Mock/console backend (development)

Provider is selected via SMS_PROVIDER env var:
  SMS_PROVIDER=twilio   → use Twilio
  SMS_PROVIDER=vonage   → use Vonage
  SMS_PROVIDER=console  → print to console (default / dev)

Required env vars per provider:
  Twilio:
    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
    TWILIO_FROM_NUMBER     (e.g. +12025551234)

  Vonage:
    VONAGE_API_KEY
    VONAGE_API_SECRET
    VONAGE_FROM_NAME       (e.g. CuraBook)

Usage:
    from integrations.sms import sms_backend
    sms_backend.send(to='+201234567890', message='Your appointment is confirmed.')
"""

import os
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger('curabook')


# ─── Abstract Base ─────────────────────────────────────────────────────────────

class BaseSMSBackend(ABC):
    """Abstract interface all SMS backends must implement."""

    @abstractmethod
    def send(self, to: str, message: str) -> dict:
        """
        Send an SMS message.

        Args:
            to:      E.164 format phone number (e.g. '+201234567890')
            message: Plain text message body

        Returns:
            dict with at least: { 'status': 'sent'|'failed', 'provider': str }
        """


# ─── Console Backend (Development) ────────────────────────────────────────────

class ConsoleSMSBackend(BaseSMSBackend):
    """
    Prints SMS to console/logs instead of sending.
    Safe for development and testing.
    """

    def send(self, to: str, message: str) -> dict:
        logger.info(f'[SMS:Console] TO={to} | MSG={message}')
        logger.debug(f'[SMS] To: {to} | Message: {message}')
        return {'status': 'sent', 'provider': 'console', 'to': to}


# ─── Twilio Backend ────────────────────────────────────────────────────────────

class TwilioSMSBackend(BaseSMSBackend):
    """
    Sends SMS via Twilio REST API.
    Requires: pip install twilio

    Env vars:
        TWILIO_ACCOUNT_SID
        TWILIO_AUTH_TOKEN
        TWILIO_FROM_NUMBER
    """

    def __init__(self):
        try:
            from twilio.rest import Client as TwilioClient
        except ImportError:
            raise ImportError(
                'Twilio SMS requires the twilio package. '
                'Run: pip install twilio'
            )

        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token  = os.environ.get('TWILIO_AUTH_TOKEN')
        self._from  = os.environ.get('TWILIO_FROM_NUMBER')

        if not all([account_sid, auth_token, self._from]):
            raise EnvironmentError(
                'Twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, '
                'and TWILIO_FROM_NUMBER environment variables.'
            )

        self._client = TwilioClient(account_sid, auth_token)

    def send(self, to: str, message: str) -> dict:
        try:
            msg = self._client.messages.create(
                body=message,
                from_=self._from,
                to=to,
            )
            logger.info(f'[SMS:Twilio] Sent SID={msg.sid} to {to}')
            return {
                'status':   'sent',
                'provider': 'twilio',
                'sid':      msg.sid,
                'to':       to,
            }
        except Exception as exc:
            logger.error(f'[SMS:Twilio] Failed to send to {to}: {exc}')
            return {'status': 'failed', 'provider': 'twilio', 'error': str(exc), 'to': to}


# ─── Vonage Backend ────────────────────────────────────────────────────────────

class VonageSMSBackend(BaseSMSBackend):
    """
    Sends SMS via Vonage (Nexmo) API.
    Requires: pip install vonage

    Env vars:
        VONAGE_API_KEY
        VONAGE_API_SECRET
        VONAGE_FROM_NAME   (sender name, e.g. 'CuraBook')
    """

    def __init__(self):
        try:
            import vonage
        except ImportError:
            raise ImportError(
                'Vonage SMS requires the vonage package. '
                'Run: pip install vonage'
            )

        api_key    = os.environ.get('VONAGE_API_KEY')
        api_secret = os.environ.get('VONAGE_API_SECRET')
        self._from = os.environ.get('VONAGE_FROM_NAME', 'CuraBook')

        if not all([api_key, api_secret]):
            raise EnvironmentError(
                'Vonage requires VONAGE_API_KEY and VONAGE_API_SECRET '
                'environment variables.'
            )

        self._client = vonage.Client(key=api_key, secret=api_secret)
        self._sms    = vonage.Sms(self._client)

    def send(self, to: str, message: str) -> dict:
        try:
            response = self._sms.send_message({
                'from': self._from,
                'to':   to.lstrip('+'),   # Vonage uses numbers without '+'
                'text': message,
            })
            msg_status = response['messages'][0]
            if msg_status['status'] == '0':
                logger.info(f"[SMS:Vonage] Sent msg-id={msg_status['message-id']} to {to}")
                return {
                    'status':   'sent',
                    'provider': 'vonage',
                    'msg_id':   msg_status['message-id'],
                    'to':       to,
                }
            else:
                error = msg_status.get('error-text', 'Unknown error')
                logger.error(f'[SMS:Vonage] Failed to send to {to}: {error}')
                return {'status': 'failed', 'provider': 'vonage', 'error': error, 'to': to}
        except Exception as exc:
            logger.error(f'[SMS:Vonage] Exception sending to {to}: {exc}')
            return {'status': 'failed', 'provider': 'vonage', 'error': str(exc), 'to': to}


# ─── Factory ───────────────────────────────────────────────────────────────────

def get_sms_backend() -> BaseSMSBackend:
    """
    Returns the appropriate SMS backend based on SMS_PROVIDER env var.
    Defaults to ConsoleSMSBackend (safe for dev / when provider not configured).
    """
    provider = os.environ.get('SMS_PROVIDER', 'console').lower()

    backends = {
        'console': ConsoleSMSBackend,
        'twilio':  TwilioSMSBackend,
        'vonage':  VonageSMSBackend,
    }

    backend_class = backends.get(provider)
    if not backend_class:
        logger.warning(
            f"[SMS] Unknown SMS_PROVIDER='{provider}'. "
            f"Falling back to console backend."
        )
        backend_class = ConsoleSMSBackend

    logger.info(f'[SMS] Using backend: {backend_class.__name__}')
    return backend_class()


# Singleton instance — import this everywhere
sms_backend: BaseSMSBackend = get_sms_backend()


# ── Egypt providers delegation ─────────────────────────────────────────────────
# If SMS_PROVIDER is an Egyptian provider, we delegate to egypt_sms
import os as _os
_egypt_providers = {'vodafone_egypt', 'smsmisr', 'conneckio'}
if _os.environ.get('SMS_PROVIDER', '') in _egypt_providers:
    from integrations.egypt_sms import egypt_sms as sms_backend  # noqa: F811

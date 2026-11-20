"""
CuraBook — Egyptian SMS Providers
====================================
بروفايدرز SMS مصرية محلية — أكثر موثوقية من Twilio في مصر.

Providers:
    vodafone_egypt  — Vodafone Egypt SMS API (الأكثر استخداماً)
    smsmisr         — SMS Misr (بروفايدر مصري شهير)
    conneckio       — Conneckio (مدعوم من المحمول المصري)
    console         — للـ development (يطبع في الـ terminal)

Env vars:
    SMS_PROVIDER=vodafone_egypt | smsmisr | conneckio | console

    Vodafone Egypt:
        VODAFONE_EGYPT_API_URL
        VODAFONE_EGYPT_API_KEY
        VODAFONE_EGYPT_SENDER_ID   (e.g. CuraBook)

    SMS Misr:
        SMSMISR_USERNAME
        SMSMISR_PASSWORD
        SMSMISR_SENDER             (e.g. CuraBook)

    Conneckio:
        CONNECKIO_API_KEY
        CONNECKIO_SENDER_ID

Usage:
    from integrations.egypt_sms import egypt_sms
    egypt_sms.send(to='+201234567890', message='موعدك غداً الساعة 10 ص')
"""

import os
import logging
import requests

logger = logging.getLogger('curabook.sms')


# ── Base class ─────────────────────────────────────────────────────────────────

class BaseEgyptSMS:
    def send(self, to: str, message: str) -> bool:
        raise NotImplementedError


# ── Vodafone Egypt ─────────────────────────────────────────────────────────────

class VodafoneEgyptSMS(BaseEgyptSMS):
    """
    Vodafone Egypt SMS API.
    الأكثر موثوقية للأرقام المصرية (+2010x).
    """

    def __init__(self):
        self.api_url   = os.environ.get('VODAFONE_EGYPT_API_URL', 'https://smsvas.vodafone.com.eg/publish/api/v1/sms/sendOTPSms')
        self.api_key   = os.environ.get('VODAFONE_EGYPT_API_KEY', '')
        self.sender_id = os.environ.get('VODAFONE_EGYPT_SENDER_ID', 'CuraBook')

    def send(self, to: str, message: str) -> bool:
        try:
            resp = requests.post(
                self.api_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}',
                },
                json={
                    'to':      to.lstrip('+'),
                    'from':    self.sender_id,
                    'message': message,
                },
                timeout=10,
            )
            success = resp.status_code == 200
            if success:
                logger.info('[VodafoneEgypt] SMS sent to %s', to)
            else:
                logger.warning('[VodafoneEgypt] SMS failed to %s: %s', to, resp.text)
            return success
        except Exception as exc:
            logger.error('[VodafoneEgypt] SMS error to %s: %s', to, exc)
            return False


# ── SMS Misr ───────────────────────────────────────────────────────────────────

class SmsMisrSMS(BaseEgyptSMS):
    """
    SMS Misr — بروفايدر مصري شهير.
    https://smsmisr.com/api/SMS/
    """

    BASE_URL = 'https://smsmisr.com/api/SMS/'

    def __init__(self):
        self.username  = os.environ.get('SMSMISR_USERNAME', '')
        self.password  = os.environ.get('SMSMISR_PASSWORD', '')
        self.sender    = os.environ.get('SMSMISR_SENDER', 'CuraBook')

    def send(self, to: str, message: str) -> bool:
        try:
            resp = requests.get(
                self.BASE_URL,
                params={
                    'Username': self.username,
                    'password': self.password,
                    'language': '2',       # 2 = Arabic, 1 = English
                    'SMSText':  message,
                    'MSISDN':   to.lstrip('+'),
                    'Sender':   self.sender,
                },
                timeout=10,
            )
            success = '4901' in resp.text  # SMS Misr success code
            if success:
                logger.info('[SmsMisr] SMS sent to %s', to)
            else:
                logger.warning('[SmsMisr] SMS failed to %s: %s', to, resp.text)
            return success
        except Exception as exc:
            logger.error('[SmsMisr] SMS error to %s: %s', to, exc)
            return False


# ── Conneckio ──────────────────────────────────────────────────────────────────

class ConneckioSMS(BaseEgyptSMS):
    """
    Conneckio — يدعم شبكات المحمول المصرية الأربع.
    https://conneckio.com/api/
    """

    BASE_URL = 'https://api.conneckio.com/api/send'

    def __init__(self):
        self.api_key   = os.environ.get('CONNECKIO_API_KEY', '')
        self.sender_id = os.environ.get('CONNECKIO_SENDER_ID', 'CuraBook')

    def send(self, to: str, message: str) -> bool:
        try:
            resp = requests.post(
                self.BASE_URL,
                json={
                    'apikey':    self.api_key,
                    'to':        to,
                    'from':      self.sender_id,
                    'message':   message,
                    'encoding':  'auto',
                },
                timeout=10,
            )
            success = resp.status_code in (200, 201)
            if success:
                logger.info('[Conneckio] SMS sent to %s', to)
            else:
                logger.warning('[Conneckio] SMS failed to %s: %s', to, resp.text)
            return success
        except Exception as exc:
            logger.error('[Conneckio] SMS error to %s: %s', to, exc)
            return False


# ── Console (Dev) ──────────────────────────────────────────────────────────────

class ConsoleSMS(BaseEgyptSMS):
    def send(self, to: str, message: str) -> bool:
        logger.debug(f'[SMS → {to}] {message}')
        logger.debug('[ConsoleSMS] to=%s message=%s', to, message)
        return True


# ── Factory ────────────────────────────────────────────────────────────────────

def _build_egypt_sms():
    provider = os.environ.get('SMS_PROVIDER', 'console')
    backends = {
        'vodafone_egypt': VodafoneEgyptSMS,
        'smsmisr':        SmsMisrSMS,
        'conneckio':      ConneckioSMS,
        'console':        ConsoleSMS,
    }
    cls = backends.get(provider, ConsoleSMS)
    return cls()


egypt_sms = _build_egypt_sms()

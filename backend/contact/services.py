"""
CuraBook — Contact Service  (v31 API-M11)
==========================================
Business logic extracted from ContactView so the view stays thin.
This pattern matches the existing services pattern used across the project
(appointments/services.py, notifications/services.py, etc.)
"""

import logging
from django.core.mail import send_mail
from django.conf import settings

from .models import ContactMessage

logger = logging.getLogger('curabook')


def get_client_ip(request) -> str | None:
    """Extract real client IP, respecting X-Forwarded-For."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def save_contact_message(*, name: str, email: str, subject: str, message: str, ip_address: str | None) -> ContactMessage:
    """
    Persist the contact form submission to the database.
    Returns the saved ContactMessage instance.
    """
    msg = ContactMessage.objects.create(
        name=name,
        email=email,
        subject=subject,
        message=message,
        ip_address=ip_address,
    )
    logger.info('[Contact] New submission', extra={'id': msg.id, 'email': email, 'ip': ip_address})
    return msg


def send_confirmation_email(msg: ContactMessage) -> bool:
    """
    Send a confirmation email to the contact form submitter.
    Returns True on success, False on any failure.
    Never raises — email is best-effort and must not block the HTTP response.
    """
    try:
        send_mail(
            subject='We received your message — CuraBook Support',
            message=(
                f'Hi {msg.name},\n\n'
                f'Thank you for contacting CuraBook. '
                f"We've received your message and will reply within 24 hours.\n\n"
                f'Your message:\n{msg.message}\n\n'
                f'— The CuraBook Team'
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'support@curabook.com'),
            recipient_list=[msg.email],
            fail_silently=True,
        )
        return True
    except Exception as exc:
        logger.warning(f'[Contact] Confirmation email failed for {msg.email}: {exc}')
        return False


def process_contact_submission(*, name: str, email: str, subject: str, message: str, request) -> ContactMessage:
    """
    Full contact form processing pipeline:
      1. Extract IP from request
      2. Save to database
      3. Fire confirmation email (best-effort)
      4. Return saved message for the view to respond with

    Usage in view:
        msg = process_contact_submission(name=..., email=..., ..., request=request)
    """
    ip = get_client_ip(request)
    msg = save_contact_message(name=name, email=email, subject=subject, message=message, ip_address=ip)
    send_confirmation_email(msg)
    return msg

"""
CuraBook — Accounts Celery Tasks
=================================
FIX BUG-10: Migrated from users/tasks.py to apps.accounts/tasks.py
Update Celery routing in settings/base.py to point here.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_activation_email(self, subject, template_name, context, recipient_list):
    """
    Send a transactional email using a Django template.
    Retries up to 3 times with a 60-second delay on failure.
    """
    try:
        html_message = render_to_string(template_name, context)
        send_mail(
            subject=subject,
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"[EMAIL SENT] to {recipient_list}")
    except Exception as exc:
        logger.error(f"[EMAIL FAILED] to {recipient_list}. Error: {exc}")
        raise self.retry(exc=exc, countdown=60)

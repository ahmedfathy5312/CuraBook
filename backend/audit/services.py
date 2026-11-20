"""
CuraBook — Audit Service
Single function used everywhere to log critical actions.
"""

import logging
from .models import AuditLog

logger = logging.getLogger('curabook')


def log_action(
    *,
    actor=None,
    action: str,
    obj=None,
    old_data=None,
    new_data=None,
    metadata: dict = None,
    note: str = '',
    request=None,         # pass request to auto-extract IP
):
    """
    Central audit logging function.

    Usage:
        log_action(actor=request.user, action=AuditLog.Action.BOOKING, obj=appointment)
        log_action(actor=user, action='login', metadata={'method': 'jwt'}, request=request)
    """
    ip = None
    if request:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')

    try:
        return AuditLog.log(
            actor=actor,
            action=action,
            obj=obj,
            old_data=old_data,
            new_data=new_data,
            metadata=metadata,
            note=note,
            ip_address=ip,
        )
    except Exception as e:
        # Audit failures should NEVER break the main flow
        logger.error(f'[Audit] Failed to log action={action}: {e}')
        return None

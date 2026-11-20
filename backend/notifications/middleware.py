"""
CuraBook — JWT Authentication Middleware for WebSocket
FIX SEC-01: Now supports BOTH authentication methods:
  1. Ticket-based (preferred): ws://...?ticket=<uuid>
     - Short-lived (30s), one-time use, stored in Redis
     - JWT never appears in URL, logs, or history
  2. Token-based (legacy fallback): ws://...?token=<access_token>
     - Still supported for backward compatibility
     - Logs a deprecation warning when used
"""

import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger('curabook')


@database_sync_to_async
def get_user_from_ticket(ticket: str):
    """
    FIX SEC-01: Resolves a WS ticket to a User.
    The ticket is consumed (deleted) on first use — one-time only.
    Returns AnonymousUser if ticket is missing, expired, or already used.
    """
    from django.core.cache import cache
    from django.contrib.auth import get_user_model
    User = get_user_model()

    cache_key = f"ws_ticket:{ticket}"
    user_id = cache.get(cache_key)

    if user_id is None:
        logger.warning('[WS Auth] Invalid or expired ticket: %s', ticket[:8] + '…')
        return AnonymousUser()

    # One-time use — delete immediately after resolution
    cache.delete(cache_key)

    try:
        user = User.objects.get(id=user_id, is_active=True, is_deleted=False)
        return user
    except User.DoesNotExist:
        logger.warning('[WS Auth] Ticket user_id=%s not found', user_id)
        return AnonymousUser()
    except Exception as e:
        logger.error('[WS Auth] Ticket resolution error: %s', e)
        return AnonymousUser()


@database_sync_to_async
def get_user_from_token(token_key: str):
    """
    Legacy: validates a JWT access token directly.
    Still supported but deprecated — use ticket-based auth instead.
    """
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError, TokenExpiredError
    from django.contrib.auth import get_user_model
    import datetime

    User = get_user_model()

    try:
        access_token = AccessToken(token_key)

        # Explicit expiry check at handshake time
        exp = access_token.get('exp')
        if exp is None:
            logger.warning('[WS Auth] Token missing exp claim')
            return AnonymousUser()

        now = int(datetime.datetime.utcnow().timestamp())
        if now >= exp:
            logger.warning('[WS Auth] Token expired at handshake (exp=%s, now=%s)', exp, now)
            return AnonymousUser()

        user_id = access_token['user_id']
        user = User.objects.get(id=user_id, is_active=True, is_deleted=False)
        return user

    except TokenExpiredError:
        logger.warning('[WS Auth] Token expired (TokenExpiredError)')
        return AnonymousUser()
    except (InvalidToken, TokenError) as e:
        logger.warning('[WS Auth] Invalid token: %s', e)
        return AnonymousUser()
    except User.DoesNotExist:
        logger.warning('[WS Auth] User not found for token')
        return AnonymousUser()
    except Exception as e:
        logger.error('[WS Auth] Unexpected error: %s', e)
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket authentication middleware.

    Priority:
      1. ?ticket=<uuid>  — preferred (SEC-01 fix, token never in URL)
      2. ?token=<jwt>    — legacy fallback (logs deprecation warning)
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)

        ticket_list = params.get('ticket', [])
        token_list  = params.get('token', [])

        if ticket_list:
            # Preferred: ticket-based auth
            scope['user'] = await get_user_from_ticket(ticket_list[0])
        elif token_list:
            # Legacy: token-in-URL (still works, but logs a warning)
            logger.warning(
                '[WS Auth] DEPRECATED: token passed in URL query string. '
                'Use POST /api/v1/auth/ws-ticket/ to obtain a one-time ticket instead.'
            )
            scope['user'] = await get_user_from_token(token_list[0])
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Wraps inner application with JWT auth middleware."""
    return JWTAuthMiddleware(inner)

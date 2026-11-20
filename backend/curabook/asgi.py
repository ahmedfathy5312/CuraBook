"""
CuraBook — ASGI Configuration
Supports both HTTP (Django) and WebSocket (Channels).
"""

import os
import django
from django.core.asgi import get_asgi_application

# ✅ FIX: Default to dev settings — prod should be set explicitly via env var
# In production: set DJANGO_SETTINGS_MODULE=curabook.settings.prod in Docker/server env
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'curabook.settings.dev')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from notifications.middleware import JWTAuthMiddlewareStack

# Import WebSocket URL patterns from all apps
from notifications.routing import websocket_urlpatterns as notifications_ws
from chat.routing import websocket_urlpatterns as chat_ws

# Combine all WebSocket patterns
all_websocket_urlpatterns = notifications_ws + chat_ws

application = ProtocolTypeRouter({
    # HTTP → Django views (standard)
    'http': get_asgi_application(),

    # WebSocket → Channels consumers
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(all_websocket_urlpatterns)
        )
    ),
})

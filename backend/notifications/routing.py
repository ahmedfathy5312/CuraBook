"""
CuraBook — WebSocket URL Routing
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Main notification channel for every user
    # Connect: ws://localhost:8000/ws/notifications/?token=<jwt>
    re_path(
        r'^ws/notifications/$',
        consumers.NotificationConsumer.as_asgi(),
    ),
]

"""
CuraBook — WSGI Configuration
================================
Used by: Gunicorn, uWSGI, and any WSGI-compatible server.
For ASGI (WebSocket/async), see asgi.py.

DJANGO_SETTINGS_MODULE is set to prod by default.
Override with environment variable in deployment.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "curabook.settings.prod")

application = get_wsgi_application()

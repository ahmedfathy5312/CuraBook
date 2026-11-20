"""
CuraBook — Staging Settings
Run with: DJANGO_SETTINGS_MODULE=curabook.settings.staging

Staging is as close to production as possible but with:
  - DEBUG = False
  - Console email (not SMTP)
  - Swagger still enabled (for QA team)
  - Less strict HSTS (no preload)
  - Same DB/Redis/Celery config as prod
"""

from .base import *  # noqa
import os

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
DEBUG      = False
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'staging.curabook.com,localhost').split(',')

CSRF_TRUSTED_ORIGINS = os.environ.get(
    'CSRF_TRUSTED_ORIGINS', 'https://staging.curabook.com'
).split(',')

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', 'https://staging.curabook.com'
).split(',')

# HTTPS — staging uses HSTS without preload
SECURE_SSL_REDIRECT            = True
SECURE_HSTS_SECONDS            = 3600      # 1 hour only (not 1 year like prod)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = False     # Never preload on staging
SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
X_FRAME_OPTIONS                = 'DENY'

# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ['DB_NAME'],
        'USER':     os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST':     os.environ.get('DB_HOST', 'db'),
        'PORT':     os.environ.get('DB_PORT', '5432'),
        'OPTIONS':  {'connect_timeout': 10},
        'CONN_MAX_AGE': 60,
    }
}

# ─────────────────────────────────────────────
# Email — console in staging (no SMTP needed)
# ─────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─────────────────────────────────────────────
# Cache — Redis (same as prod)
# ─────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND':    'django.core.cache.backends.redis.RedisCache',
        'LOCATION':   f'{REDIS_URL}/1',
        'TIMEOUT':    60 * 15,
        'KEY_PREFIX': 'curabook:staging',
    }
}

# ─────────────────────────────────────────────
# Static Files — whitenoise
# ─────────────────────────────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─────────────────────────────────────────────
# Swagger — enabled on staging for QA
# ─────────────────────────────────────────────
SPECTACULAR_SETTINGS['SERVERS'] = [
    {'url': 'https://staging.curabook.com', 'description': 'Staging Server'},
]

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
import os as _os
_os.makedirs(BASE_DIR / 'logs', exist_ok=True)

LOGGING['root']['level'] = 'WARNING'
LOGGING['loggers']['django']['level']   = 'INFO'
LOGGING['loggers']['curabook']['level'] = 'DEBUG'   # Verbose on staging for debugging

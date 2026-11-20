"""
CuraBook — Production Settings
Run with: DJANGO_SETTINGS_MODULE=curabook.settings.prod
All sensitive values MUST be set via environment variables.
"""

from .base import *  # noqa
import os

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
DEBUG       = False
SECRET_KEY  = os.environ['DJANGO_SECRET_KEY']   # Must be set — crash if missing

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')

CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_ALL_ORIGINS = False

# HTTPS hardening
SECURE_SSL_REDIRECT              = True
SECURE_HSTS_SECONDS              = 31536000   # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS   = True
SECURE_HSTS_PRELOAD              = True
SECURE_PROXY_SSL_HEADER          = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE            = True
CSRF_COOKIE_SECURE               = True
SECURE_CONTENT_TYPE_NOSNIFF      = True
SECURE_BROWSER_XSS_FILTER        = True
X_FRAME_OPTIONS                  = 'DENY'

# ─────────────────────────────────────────────
# Database — from environment
# ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ['DB_NAME'],
        'USER':     os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST':     os.environ.get('DB_HOST', 'db'),   # Docker service name
        'PORT':     os.environ.get('DB_PORT', '5432'),
        'OPTIONS':  {'connect_timeout': 10},
        'CONN_MAX_AGE': 60,
    }
}

# ─────────────────────────────────────────────
# Email — SMTP in production
# ─────────────────────────────────────────────
EMAIL_BACKEND    = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST       = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT       = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS    = True
EMAIL_HOST_USER  = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# ─────────────────────────────────────────────
# Cache — Redis in production
# ─────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND':  'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'{REDIS_URL}/1',
        'TIMEOUT':  60 * 15,
        'KEY_PREFIX': 'curabook:prod',
    }
}

# ─────────────────────────────────────────────
# Static Files — whitenoise for serving
# ─────────────────────────────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─────────────────────────────────────────────
# Logging — file + console in production
# ─────────────────────────────────────────────
import os as _os
_os.makedirs(BASE_DIR / 'logs', exist_ok=True)

LOGGING['root']['level'] = 'WARNING'
LOGGING['loggers']['django']['level'] = 'WARNING'
LOGGING['loggers']['curabook']['level'] = 'INFO'

# ─────────────────────────────────────────────
# CORS — Production (reads from environment)
# Set CORS_ALLOWED_ORIGINS in .env or docker-compose
# ─────────────────────────────────────────────
_cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()] or [
    'https://curabook.com',
    'https://www.curabook.com',
]

_csrf_env = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_env.split(',') if o.strip()] or [
    'https://curabook.com',
    'https://www.curabook.com',
]

CORS_ALLOW_ALL_ORIGINS = False   # NEVER True in production

# ─────────────────────────────────────────────
# Sentry — Error Monitoring & Performance
# ─────────────────────────────────────────────
# pip install sentry-sdk
# Set SENTRY_DSN environment variable
_SENTRY_DSN = os.environ.get('SENTRY_DSN', '')


def _sentry_before_send(event, hint):
    """Strip sensitive data before sending to Sentry."""
    # Remove Authorization headers
    if 'request' in event:
        headers = event['request'].get('headers', {})
        headers.pop('Authorization', None)
        headers.pop('Cookie', None)
    return event


if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    import logging

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='url',    # Group by URL pattern
                middleware_spans=True,
                signals_spans=False,        # Avoid noise from signals
                cache_spans=True,
            ),
            CeleryIntegration(
                monitor_beat_tasks=True,    # Track Celery Beat task health
                propagate_traces=True,
            ),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.WARNING,      # Capture WARNING+ as breadcrumbs
                event_level=logging.ERROR,  # Send ERROR+ as Sentry events
            ),
        ],
        # Performance monitoring
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),

        environment=os.environ.get('DJANGO_ENV', 'production'),
        release=os.environ.get('GIT_COMMIT_SHA', 'unknown'),

        # Don't send PII (patient data)
        send_default_pii=False,

        # Ignore common non-errors
        ignore_errors=[
            KeyboardInterrupt,
            SystemExit,
        ],
        before_send=_sentry_before_send,
    )
else:
    import logging as _logging
    _logging.getLogger('django').warning(
        "[CuraBook] SENTRY_DSN is not configured — errors will NOT be tracked. "
        "Set SENTRY_DSN in your environment before going live."
    )


# ─────────────────────────────────────────────
# Content Security Policy (CSP)
# ─────────────────────────────────────────────
# pip install django-csp
# Prevents XSS by whitelisting allowed script/style sources.
INSTALLED_APPS += ['csp']  # type: ignore[name-defined]

MIDDLEWARE += ['csp.middleware.CSPMiddleware']  # type: ignore[name-defined]

# CSP directives — tighten per environment as needed
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC  = ("'self'",)
CSP_STYLE_SRC   = ("'self'", "'unsafe-inline'")    # Allow inline styles (Tailwind/MUI)
CSP_IMG_SRC     = ("'self'", "data:", "https:")    # Allow CDN images
CSP_FONT_SRC    = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'", "wss:")               # Allow WebSocket (wss://)
CSP_FRAME_ANCESTORS = ("'none'",)                  # Equivalent to X-Frame-Options: DENY
CSP_REPORT_URI  = os.environ.get('CSP_REPORT_URI', '')  # Optional violation reporting


# ─────────────────────────────────────────────
# django-waffle — Feature Flags in Production
# ─────────────────────────────────────────────
if 'waffle' not in INSTALLED_APPS:
    INSTALLED_APPS += ['waffle']

# ─────────────────────────────────────────────
# Production Storage — S3 or MinIO
# ─────────────────────────────────────────────
# Set STORAGE_BACKEND=s3 or STORAGE_BACKEND=minio in env
# See infrastructure/storage/backends.py for full config
STORAGE_BACKEND = os.environ.get('STORAGE_BACKEND', 'local')

# If using S3/MinIO, override DEFAULT_FILE_STORAGE
if STORAGE_BACKEND in ('s3', 'minio'):
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID        = os.environ.get('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY    = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
    AWS_STORAGE_BUCKET_NAME  = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'curabook-media')
    AWS_S3_REGION_NAME       = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_DEFAULT_ACL          = 'private'
    AWS_S3_FILE_OVERWRITE    = False
    AWS_QUERYSTRING_AUTH     = True     # Signed URLs for private files
    AWS_QUERYSTRING_EXPIRE   = 3600     # 1 hour signed URL expiry
    if STORAGE_BACKEND == 'minio':
        AWS_S3_ENDPOINT_URL     = os.environ.get('AWS_S3_ENDPOINT_URL', 'http://minio:9000')
        AWS_S3_ADDRESSING_STYLE = 'path'


# ─────────────────────────────────────────────────────────────────────────────
# LOGGING — Structured JSON logs for ELK stack
# ─────────────────────────────────────────────────────────────────────────────
# Requires: pip install python-json-logger

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,

    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
            "rename_fields": {
                "asctime":   "timestamp",
                "levelname": "level",
                "name":      "logger",
            },
        },
        "console": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s",
        },
    },

    "handlers": {
        # JSON file → picked up by Filebeat → shipped to Logstash
        "json_file": {
            "class":     "logging.handlers.RotatingFileHandler",
            "filename":  "/app/logs/django.json",
            "formatter": "json",
            "maxBytes":  50 * 1024 * 1024,  # 50 MB per file
            "backupCount": 7,
            "encoding":  "utf-8",
        },
        # Error file — separate stream for critical issues
        "error_file": {
            "class":     "logging.handlers.RotatingFileHandler",
            "filename":  "/app/logs/django_errors.json",
            "formatter": "json",
            "level":     "ERROR",
            "maxBytes":  20 * 1024 * 1024,
            "backupCount": 30,
            "encoding":  "utf-8",
        },
        # Console (useful in Docker — captured by container runtime)
        "console": {
            "class":     "logging.StreamHandler",
            "formatter": "console",
        },
    },

    "loggers": {
        # Django internals
        "django": {
            "handlers":  ["json_file", "error_file", "console"],
            "level":     "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers":  ["json_file", "error_file"],
            "level":     "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers":  ["error_file", "json_file"],
            "level":     "WARNING",
            "propagate": False,
        },
        # CuraBook apps
        "appointments": {
            "handlers":  ["json_file", "error_file"],
            "level":     "DEBUG",
            "propagate": False,
        },
        "scheduling": {
            "handlers":  ["json_file", "error_file"],
            "level":     "DEBUG",
            "propagate": False,
        },
        "notifications": {
            "handlers":  ["json_file", "error_file"],
            "level":     "INFO",
            "propagate": False,
        },
        # Root logger — catch-all
        "": {
            "handlers":  ["json_file", "error_file"],
            "level":     "WARNING",
        },
    },
}

# Add python-json-logger to requirements (checked at startup)

# ─────────────────────────────────────────────
# F-12 FIX: JWT — Enforce RS256 in production
# ─────────────────────────────────────────────
# In production we CRASH FAST if RSA keys are missing rather than
# silently falling back to HS256 (which would be a security regression).
# Keys must be provided via env vars or Docker secrets volume mounts.
_prod_private = SIMPLE_JWT.get('SIGNING_KEY', '')
_prod_alg     = SIMPLE_JWT.get('ALGORITHM', 'HS256')

if _prod_alg != 'RS256' or not _prod_private or '-----BEGIN' not in str(_prod_private):
    raise RuntimeError(
        "\n[F-12 PRODUCTION GUARD] JWT RSA keys are missing or invalid!\n"
        "Production requires RS256 (asymmetric JWT). Supply keys via:\n"
        "  Option A (env):  JWT_PRIVATE_KEY=<PEM>  JWT_PUBLIC_KEY=<PEM>\n"
        "  Option B (file): JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private_key.pem\n"
        "                   JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public_key.pem\n"
        "Generate a key pair: python scripts/generate_jwt_keys.py\n"
    )


# ─────────────────────────────────────────────
# Data Retention Policy
# ─────────────────────────────────────────────
# Medical record retention (appointments, patient records) — 7 years default.
# Audit log retention — 3 years default.
# Celery Beat task 'purge_old_audit_logs' enforces these at midnight monthly.
DATA_RETENTION_YEARS      = int(os.environ.get('DATA_RETENTION_YEARS', '7'))
AUDIT_LOG_RETENTION_YEARS = int(os.environ.get('AUDIT_LOG_RETENTION_YEARS', '3'))

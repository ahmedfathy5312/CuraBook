"""
CuraBook — Base Settings
Shared between development and production.
Never import this file directly — use dev.py or prod.py.
"""

from pathlib import Path
from datetime import timedelta
import os

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
DEBUG = False  # Default to False for safety — overridden in dev.py / prod.py
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'change-me-in-production')
AUTH_USER_MODEL = 'accounts.User'  # ← apps.accounts domain app

# ─────────────────────────────────────────────
# Installed Apps
# ─────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'waffle',              # Feature flags
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    'channels',           # WebSocket
    'drf_spectacular',    # OpenAPI / Swagger
    'django_celery_beat', # DB-backed Celery Beat scheduler
    'django_prometheus',  # Prometheus metrics /metrics endpoint
]

LOCAL_APPS = [
    # ── Core Infrastructure ─────────────────────────────────
    'core',
    'common.apps.CommonConfig',

    # ── User Domain Apps (apps/) ─────────────────────────────
    # Each domain is isolated with its own models/services/selectors/views
    'apps.accounts.apps.AccountsConfig',    # User model + auth
    'apps.doctors.apps.DoctorsConfig',      # DoctorProfile domain
    'apps.patients.apps.PatientsConfig',    # PatientProfile domain
    'apps.assistants.apps.AssistantsConfig',    # AssistantProfile domain
    'apps.departments.apps.DepartmentsConfig',  # Department domain (extracted from hospitals)

    # ── Medical Facility Domains ─────────────────────────────
    'clinics',                            # Clinic model + ClinicAssistant
    'hospital.apps.HospitalsConfig',      # Hospital + HospitalDoctor + HospitalAssistant (label=hospitals)

    # ── Booking Lifecycle Domain ─────────────────────────────
    'appointments',  # Appointment model + booking lifecycle services

    # ── Scheduling Domain ────────────────────────────────────
    'scheduling',    # Schedule + GeneratedSlot + slot generation engine

    # ── Supporting Feature Domains ───────────────────────────
    'notifications', # Notification model + WebSocket consumers + event dispatch
    'reviews',       # Review model + rating system
    'search',        # DoctorSearch + Redis caching
    'analytics',     # Dashboard metrics + aggregations
    'audit',         # Audit log + middleware

    # ── Platform Operations ──────────────────────────────────
    'integrations',    # SMS / Payment gateway integrations (sms.py + tasks.py implemented)
    'dashboard.apps.DashboardConfig',  # Role-aware dashboard (replaced admin_tools)
    'health',        # Health monitoring endpoints
    'locations',     # ✅ NEW: Cities API for search filters
    'prescriptions', # ✅ NEW: Prescriptions management
    'contact',       # ✅ FIX B-11: Contact Us form endpoint
    'reports',       # ✅ NEW: Medical reports

    # ── SaaS Platform ────────────────────────────────────────────
    'billing.apps.BillingConfig',   # ✅ Subscription plans, Stripe, invoices
    'tenants.apps.TenantsConfig',   # ✅ Multi-tenancy isolation

    'video.apps.VideoConfig',        # ✅ Video Consultation (Daily.co / Jitsi)
    'chat.apps.ChatConfig',          # ✅ In-App Real-time Chat (doctor ↔ patient)

    # ── Legacy Compatibility ────────────────────────────────────
    # users/ MUST stay in INSTALLED_APPS: its migrations reference app_label='users_legacy'
    # internally. Without it, Django raises NodeNotFoundError on startup.
    # It owns: Document model + auth_backends shim. Domain models live in apps.*.
    'users.apps.UsersConfig',  # label='users_legacy' — required for migration graph
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────
MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # ← must be FIRST
    'django.middleware.security.SecurityMiddleware',
    'core.ip_blocking.IPBlockMiddleware',           # ✅ FIX #22: Permanent IP ban enforcement
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'audit.middleware.RequestIDMiddleware',   # Unique ID per request (tracing)
    'audit.middleware.ClientIPMiddleware',    # Real client IP resolution
    'audit.middleware.AuditLogMiddleware',    # Audit log on every request
    'tenants.middleware.TenantMiddleware',    # ✅ Sets request.tenant on every request
    'django_prometheus.middleware.PrometheusAfterMiddleware',   # ← must be LAST
]

# ─────────────────────────────────────────────
# URLs & WSGI/ASGI
# ─────────────────────────────────────────────
ROOT_URLCONF    = 'curabook.urls'
WSGI_APPLICATION = 'curabook.wsgi.application'
ASGI_APPLICATION = 'curabook.asgi.application'   # Django Channels

# ─────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ─────────────────────────────────────────────
# Database — overridden per environment
# ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     os.environ.get('DB_NAME',     'curabook_db'),
        'USER':     os.environ.get('DB_USER',     'curabook_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST':     os.environ.get('DB_HOST',     'localhost'),
        'PORT':     os.environ.get('DB_PORT',     '5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': 60,   # persistent connections
    }
}

# ─────────────────────────────────────────────
# Password Validation
# ─────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTHENTICATION_BACKENDS = [
    'apps.accounts.auth_backends.UsernameOrEmailBackend',  # ✅ FIX: was 'users.auth_backends' (old path)
    'django.contrib.auth.backends.ModelBackend',
]

# ─────────────────────────────────────────────
# Internationalization
# ─────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'       # All datetimes stored in UTC — convert at frontend
USER_TIMEZONE = os.environ.get('USER_TIMEZONE', 'Africa/Cairo')  # for display
USE_I18N      = True
USE_TZ        = True

# ─────────────────────────────────────────────
# Static & Media
# ─────────────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

# API-C07 FIX: Enforce upload size limits to prevent memory exhaustion attacks.
# Without these, a user could upload a 1GB file and exhaust server memory.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10 MB — max for non-file POST body
FILE_UPLOAD_MAX_MEMORY_SIZE =  5 * 1024 * 1024   #  5 MB — max buffered in RAM before spooling

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─────────────────────────────────────────────
# ─────────────────────────────────────────────
# CORS — Cross-Origin Resource Sharing
# Allows React frontend on :3000 (dev) or custom domain (prod)
# ─────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',      # React dev (CRA)
    'http://127.0.0.1:3000',
    'http://localhost:3080',      # React dev (CRA alt port) ← FIX: was missing
    'http://127.0.0.1:3080',      # FIX: frontend running on :3080
    'http://localhost:5173',      # React dev (Vite)
    'http://127.0.0.1:5173',
    'http://localhost:8888',      # nginx reverse proxy
    'http://127.0.0.1:8888',
]

CORS_ALLOWED_ORIGIN_REGEXES = []   # add prod domain regex here

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3080',      # FIX: frontend running on :3080
    'http://127.0.0.1:3080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8888',      # nginx reverse proxy
    'http://127.0.0.1:8888',
]

CORS_ALLOW_METHODS = [
    'DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with',
]

# WebSocket CORS — allowed hosts for Channels
ALLOWED_HOSTS_WS = [
    'localhost',
    '127.0.0.1',
]

# ─────────────────────────────────────────────
# Django REST Framework
# ─────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'core.response.renderer.CuraBookRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Global defaults
        'anon': '120/hour',
        'user': '2000/hour',

        # Auth — strict limits (increased for dev testing)
        'login':          '100/minute',
        'register':       '100/hour',
        'password_reset': '100/hour',

        # Booking — per user
        'dashboard': '30/min',
        'booking':        '10/minute',
        # FIX B-09: Appointment state-change actions (confirm/reject/cancel/complete)
        # Prevents appointment state spam without blocking legitimate rapid use.
        'appointment_action': '30/minute',

        # Search
        'search':         '30/minute',
        'search_auth':    '60/minute',

        # WebSocket
        'ws_connect':     '20/minute',

        # Contact form — anti-spam
        'contact':        '5/hour',
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

# ─────────────────────────────────────────────
# JWT — Simple JWT
# ─────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# F-12 FIX: JWT Algorithm — HS256 → RS256 (asymmetric)
#
# Why RS256 over HS256?
#   HS256 (symmetric): every service that verifies tokens must share the
#   SECRET_KEY — a leaked key compromises ALL services simultaneously.
#
#   RS256 (asymmetric RSA): the private key SIGNS tokens (held only by this
#   server), the public key VERIFIES tokens (can be shared freely with any
#   microservice or API gateway). A compromised public key cannot forge tokens.
#
# Key loading strategy (in priority order):
#   1. JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars (inline PEM — for Kubernetes
#      secrets, AWS Parameter Store, or CI/CD pipelines)
#   2. JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH env vars (path to PEM files —
#      for Docker volume mounts or bare-metal deployments)
#   3. Bundled dev keys at backend/certs/ (ONLY for development/testing)
#      ⚠️  NEVER use bundled keys in production — generate your own RSA pair.
#
# Generate a fresh key pair:
#   python scripts/generate_jwt_keys.py
#   → writes backend/certs/jwt_private_key.pem + jwt_public_key.pem
# ─────────────────────────────────────────────────────────────────────────────

def _load_jwt_key(env_var_inline: str, env_var_path: str, dev_fallback_path: str) -> str | None:
    """
    Load a JWT key from environment (inline PEM or file path) with dev fallback.
    Returns the PEM string or None if not found.
    """
    # Priority 1: inline PEM in env var (Kubernetes secrets / AWS SSM / CI)
    inline = os.environ.get(env_var_inline, '').strip()
    if inline:
        # Allow \n literal in env vars to represent newlines
        return inline.replace('\\n', '\n')

    # Priority 2: path to PEM file (Docker volume / bare-metal)
    key_path = os.environ.get(env_var_path, '').strip()
    if key_path and os.path.isfile(key_path):
        with open(key_path, 'r') as _f:
            return _f.read()

    # Priority 3: bundled dev key (dev/test only — never in production)
    if os.path.isfile(dev_fallback_path):
        return open(dev_fallback_path).read()

    return None


_CERTS_DIR = os.path.join(BASE_DIR, 'certs')
_JWT_PRIVATE_KEY = _load_jwt_key(
    'JWT_PRIVATE_KEY',
    'JWT_PRIVATE_KEY_PATH',
    os.path.join(_CERTS_DIR, 'jwt_private_key.pem'),
)
_JWT_PUBLIC_KEY = _load_jwt_key(
    'JWT_PUBLIC_KEY',
    'JWT_PUBLIC_KEY_PATH',
    os.path.join(_CERTS_DIR, 'jwt_public_key.pem'),
)

# Determine algorithm: use RS256 if keys are available, fall back to HS256 for
# local dev environments that haven't generated keys yet (prints a warning).
if _JWT_PRIVATE_KEY and _JWT_PUBLIC_KEY:
    _JWT_ALGORITHM        = 'RS256'
    _JWT_SIGNING_KEY      = _JWT_PRIVATE_KEY
    _JWT_VERIFYING_KEY    = _JWT_PUBLIC_KEY
else:
    import warnings
    warnings.warn(
        "\n[F-12] JWT RSA keys not found — falling back to HS256. "
        "Run `python scripts/generate_jwt_keys.py` to generate keys. "
        "NEVER use HS256 in production.",
        stacklevel=2
    )
    _JWT_ALGORITHM     = 'HS256'
    _JWT_SIGNING_KEY   = SECRET_KEY
    _JWT_VERIFYING_KEY = SECRET_KEY


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':        timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME':       timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':        False,      # F-01 FIX: disable rotation to prevent multi-tab logout issues
    'BLACKLIST_AFTER_ROTATION':     False,
    'UPDATE_LAST_LOGIN':            True,

    # F-12 FIX: RS256 (asymmetric) instead of HS256 (symmetric)
    # Private key signs  → only this server can issue tokens
    # Public  key verifies → any microservice can validate without shared secret
    'ALGORITHM':                    _JWT_ALGORITHM,
    'SIGNING_KEY':                  _JWT_SIGNING_KEY,
    'VERIFYING_KEY':                _JWT_VERIFYING_KEY,

    'AUTH_HEADER_TYPES':            ('Bearer',),
    'USER_ID_FIELD':                'id',
    'USER_ID_CLAIM':                'user_id',
    'AUTH_TOKEN_CLASSES':           ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM':             'token_type',
}

# ─────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────
REDIS_HOST     = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT     = os.environ.get('REDIS_PORT', '6379')
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')
REDIS_URL      = (
    f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}'
    if REDIS_PASSWORD
    else f'redis://{REDIS_HOST}:{REDIS_PORT}'
)

# ─────────────────────────────────────────────
# Cache — Redis
# ─────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND':  'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'{REDIS_URL}/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 60 * 15,   # 15 minutes default
        'KEY_PREFIX': 'curabook',
    }
}

# ─────────────────────────────────────────────
# Django Channels — WebSocket
# ─────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            # FIX: URL string instead of tuple — required to pass password to Redis
            'hosts': [f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}"],
            'capacity': 1500,
            'expiry':   60,
        },
    },
}

# ─────────────────────────────────────────────
# Celery
# ─────────────────────────────────────────────
CELERY_BROKER_URL              = f'{REDIS_URL}/0'
CELERY_RESULT_BACKEND          = f'{REDIS_URL}/1'  # DB 1 for results, DB 0 for broker
CELERY_ACCEPT_CONTENT          = ['json']
CELERY_TASK_SERIALIZER         = 'json'
CELERY_RESULT_SERIALIZER       = 'json'
CELERY_TIMEZONE                = TIME_ZONE
CELERY_TASK_TRACK_STARTED      = True
CELERY_TASK_TIME_LIMIT         = 30 * 60       # 30 min hard limit
CELERY_TASK_SOFT_TIME_LIMIT    = 25 * 60       # 25 min soft limit
CELERY_WORKER_MAX_TASKS_PER_CHILD = 200        # prevent memory leaks

# Celery Beat — use DB scheduler (django_celery_beat)
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Celery Beat — periodic tasks are defined in curabook/celery.py (app.conf.beat_schedule)
# Using the DB-backed scheduler: django_celery_beat.schedulers:DatabaseScheduler
CELERY_BEAT_SCHEDULE = {}  # Managed via celery.py app.conf.beat_schedule

# ─────────────────────────────────────────────
# Email — overridden per environment
# ─────────────────────────────────────────────
EMAIL_BACKEND   = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend',   # dev default — override via env in prod
)
EMAIL_HOST          = os.environ.get('EMAIL_HOST',          'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT',      '587'))
EMAIL_USE_TLS       = os.environ.get('EMAIL_USE_TLS',       'True') == 'True'
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER',     '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL',  'CuraBook <noreply@curabook.com>')
EMAIL_SUBJECT_PREFIX = '[CuraBook] '

# ─────────────────────────────────────────────
# drf-spectacular — OpenAPI / Swagger
# ─────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE':       'CuraBook API',
    'DESCRIPTION': 'Enterprise Medical Booking Platform — REST API',
    'VERSION':     '5.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'SECURITY': [{'bearerAuth': []}],
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayRequestDuration': True,
    },
}


# ─────────────────────────────────────────────
# Logging — base config
# ─────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'request_id': {
            '()': 'core.logging_filters.RequestIDFilter',
        },
    },
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{request_id}] {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'filters':   ['request_id'],
            'formatter': 'verbose',
        },
        'file': {
            'class':     'logging.handlers.RotatingFileHandler',
            'filename':  BASE_DIR / 'logs' / 'curabook.log',
            'maxBytes':  1024 * 1024 * 10,   # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level':    'WARNING',
    },
    'loggers': {
        'django': {
            'handlers':  ['console', 'file'],
            'level':     'INFO',
            'propagate': False,
        },
        'curabook': {
            'handlers':  ['console', 'file'],
            'level':     'DEBUG',
            'propagate': False,
        },
        'celery': {
            'handlers':  ['console'],
            'level':     'INFO',
            'propagate': False,
        },
    },
}

# ─────────────────────────────────────────────
# Celery — Queue Separation
# ─────────────────────────────────────────────
# Route tasks to specific queues for better prioritization and scaling.
# Run separate workers per queue:
#   celery -A curabook worker -Q emails -c 4
#   celery -A curabook worker -Q notifications -c 4
#   celery -A curabook worker -Q reminders -c 2
#   celery -A curabook worker -Q analytics -c 1
#   celery -A curabook worker -Q default -c 4

CELERY_TASK_QUEUES = {
    'default':       {'exchange': 'default',       'routing_key': 'default'},
    'emails':        {'exchange': 'emails',        'routing_key': 'emails'},
    'notifications': {'exchange': 'notifications', 'routing_key': 'notifications'},
    'reminders':     {'exchange': 'reminders',     'routing_key': 'reminders'},
    'analytics':     {'exchange': 'analytics',     'routing_key': 'analytics'},
    'scheduling':    {'exchange': 'scheduling',    'routing_key': 'scheduling'},
}

CELERY_DEFAULT_QUEUE   = 'default'
CELERY_DEFAULT_EXCHANGE = 'default'
CELERY_DEFAULT_ROUTING_KEY = 'default'

CELERY_TASK_ROUTES = {
    # Email tasks → emails queue (high priority, separate workers)
    'notifications.tasks.send_notification_email':  {'queue': 'emails'},
    'notifications.tasks.send_bulk_notifications':  {'queue': 'emails'},
    'appointments.tasks.send_appointment_email':    {'queue': 'emails'},
    'apps.accounts.tasks.send_activation_email':    {'queue': 'emails'},  # FIX BUG-10: was users.tasks

    # Real-time notification tasks
    'notifications.tasks.*':                        {'queue': 'notifications'},

    # Reminder & expiry tasks → reminders queue
    'appointments.tasks.send_appointment_reminders':   {'queue': 'reminders'},
    'appointments.tasks.expire_pending_appointments':  {'queue': 'reminders'},

    # SMS integration tasks → reminders queue
    'integrations.tasks.send_sms_notification':        {'queue': 'reminders'},
    'integrations.tasks.send_appointment_sms_reminder':{'queue': 'reminders'},
    'integrations.tasks.send_sms_reminders_24h':       {'queue': 'reminders'},

    # Scheduling / slot generation → scheduling queue
    'scheduling.tasks.generate_slots_for_next_30_days': {'queue': 'scheduling'},
    'scheduling.tasks.generate_slots_for_schedule':     {'queue': 'scheduling'},

    # Analytics & reporting → low-priority queue
    'analytics.*':                                  {'queue': 'analytics'},
    'audit.tasks.cleanup_old_logs':                 {'queue': 'analytics'},
}

# ─────────────────────────────────────────────
# Feature Flags — django-waffle
# ─────────────────────────────────────────────
# pip install django-waffle
# Add 'waffle' to INSTALLED_APPS and run: python manage.py migrate
#
# Usage in code:
#   import waffle
#   if waffle.flag_is_active(request, 'new_booking_flow'):
#       ...
#
# Features currently managed:
#   new_booking_flow     — A/B test new booking UI
#   elasticsearch_search — Switch to ES-backed search
#   sms_notifications    — Enable SMS alongside email
#   online_payment       — Enable payment gateway
#   video_consultation   — Enable telemedicine

WAFFLE_FLAG_DEFAULT  = False   # Flags are OFF by default
WAFFLE_SWITCH_DEFAULT = False
WAFFLE_LOG_MISSING_FLAGS = 'WARNING'

# ─────────────────────────────────────────────
# Frontend URL (for password reset / email verify links)
# ─────────────────────────────────────────────
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


# ─────────────────────────────────────────────
# Structlog — Structured JSON Logging
# ─────────────────────────────────────────────
# Activated here so both dev and prod get structured logs.
# In production, JSON output is enabled automatically.
# In development, human-readable colored output is used.
try:
    from core.structlog_config import configure_structlog
    configure_structlog(json_output=not DEBUG)
except Exception:
    pass  # Graceful fallback if structlog not installed

# ─────────────────────────────────────────────
# ✅ FIX #22: IP Blocking Configuration
# ─────────────────────────────────────────────
IP_BLOCK_CACHE_TTL          = 300    # Seconds to cache block status in Redis
BRUTE_FORCE_BAN_THRESHOLD   = 20     # Failed attempts before auto-ban
BRUTE_FORCE_WINDOW_SECONDS  = 3600   # Sliding window for counting failures (1 hour)

# ─────────────────────────────────────────────
# Billing & Stripe
# ─────────────────────────────────────────────
# Set BILLING_PROVIDER=mock for development (no Stripe calls)
# Set BILLING_PROVIDER=stripe for production
import os as _os_billing
BILLING_PROVIDER       = _os_billing.environ.get('BILLING_PROVIDER', 'mock')
STRIPE_SECRET_KEY      = _os_billing.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = _os_billing.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET  = _os_billing.environ.get('STRIPE_WEBHOOK_SECRET', '')

# ─────────────────────────────────────────────
# Video Consultation
# ─────────────────────────────────────────────
VIDEO_PROVIDER = os.environ.get('VIDEO_PROVIDER', 'jitsi')
JITSI_DOMAIN   = os.environ.get('JITSI_DOMAIN', 'meet.jit.si')
JITSI_SECRET   = os.environ.get('JITSI_SECRET', '')

# ── JITSI_SECRET startup validation ──────────────────────────────────────────
# If VIDEO_PROVIDER is jitsi and JITSI_SECRET is empty, any user who knows
# the room_name can join a private medical consultation without authentication.
# In production (DEBUG=False), we enforce this for security.
import sys
if not sys.argv[0].endswith('manage.py') or (len(sys.argv) > 1 and sys.argv[1] not in ('makemigrations', 'migrate', 'shell', 'collectstatic', 'check')):
    _is_prod = os.environ.get('DJANGO_ENV') == 'production'
    if _is_prod and VIDEO_PROVIDER == 'jitsi' and not JITSI_SECRET:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured(
            "JITSI_SECRET must be set when VIDEO_PROVIDER='jitsi' in production. "
            "An empty secret allows anyone with the room name to join private medical consultations."
        )

DAILY_API_KEY  = os.environ.get('DAILY_API_KEY', '')

# ─────────────────────────────────────────────
# Database Backup
# ─────────────────────────────────────────────
BACKUP_DIR            = os.environ.get('BACKUP_DIR', '/app/backups')
BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))

# ─────────────────────────────────────────────
# Egyptian Payment (Paymob)
# ─────────────────────────────────────────────
PAYMOB_API_KEY                  = os.environ.get('PAYMOB_API_KEY', '')
PAYMOB_INTEGRATION_ID           = os.environ.get('PAYMOB_INTEGRATION_ID', '')
PAYMOB_WALLET_INTEGRATION_ID    = os.environ.get('PAYMOB_WALLET_INTEGRATION_ID', '')
PAYMOB_FAWRY_INTEGRATION_ID     = os.environ.get('PAYMOB_FAWRY_INTEGRATION_ID', '')
PAYMOB_IFRAME_ID                = os.environ.get('PAYMOB_IFRAME_ID', '')
PAYMOB_HMAC_SECRET              = os.environ.get('PAYMOB_HMAC_SECRET', '')

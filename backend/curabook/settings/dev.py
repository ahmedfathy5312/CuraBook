"""
CuraBook — Development Settings
Run with: DJANGO_SETTINGS_MODULE=curabook.settings.dev
"""

from .base import *  # noqa

# ─────────────────────────────────────────────
# Static Files — WhiteNoise (Dev Fix)
# ─────────────────────────────────────────────
# Problem: The project runs via Daphne (ASGI), not Django's runserver.
# Django's built-in static-file auto-serving ONLY works with runserver.
# Daphne does NOT serve /static/ automatically, so Django Admin loses all
# CSS/JS when accessed directly on port 8000.
#
# Fix: Insert WhiteNoiseMiddleware right after SecurityMiddleware.
#   - WHITENOISE_USE_FINDERS=True lets Whitenoise find files directly from
#     each app's static/ directory (no collectstatic needed in dev).
#   - WHITENOISE_AUTOREFRESH=True reloads changed files instantly.
#   - StaticFilesStorage (non-manifest) avoids hash-fingerprinting overhead.
#
# This mirrors what prod.py does, but uses dev-friendly settings.
# WhiteNoise is already in requirements.txt (whitenoise==6.7.0).
MIDDLEWARE = [m for m in MIDDLEWARE]  # make a mutable copy of base tuple/list
_sec_idx = next(
    (i for i, m in enumerate(MIDDLEWARE)
     if m == 'django.middleware.security.SecurityMiddleware'),
    0,
)
MIDDLEWARE.insert(_sec_idx + 1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# In dev: serve directly from app static/ dirs — no collectstatic required.
WHITENOISE_USE_FINDERS   = True
WHITENOISE_AUTOREFRESH   = True
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.StaticFilesStorage",
    },
}

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
DEBUG = True
SECRET_KEY = 'dev-secret-key-not-for-production-123456789'

ALLOWED_HOSTS = ['*']

# CORS — reads from .env so the same settings file works for all dev setups.
# Default: allow all origins in dev (convenient for local work).
# Override by setting CORS_ALLOWED_ORIGINS=http://localhost:3080,http://127.0.0.1:3080
# in your .env — the moment that var is set, CORS_ALLOW_ALL_ORIGINS is flipped off.
import os as _os_cors
_cors_origins_env = _os_cors.environ.get('CORS_ALLOWED_ORIGINS', '').strip()
if _cors_origins_env:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_env.split(',') if o.strip()]
else:
    CORS_ALLOW_ALL_ORIGINS = True   # fallback: open in dev when no origins are specified

# H-07 FIX: CORS_ALLOW_CREDENTIALS must always be True in dev — required for
# HttpOnly cookie-based refresh token to work with the React frontend.
# CORS_ALLOW_ALL_ORIGINS=True alone is not enough when credentials are involved.
CORS_ALLOW_CREDENTIALS = True

# ── Cookie settings for local dev ──────────────────────────────────────────
# SameSite=Lax is required so the browser sends the __cb_refresh cookie on
# cross-origin POST requests from the Vite dev server (localhost:5173 →
# localhost:8000). SameSite=None requires Secure which requires HTTPS.
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE   = False   # no HTTPS in dev
CSRF_COOKIE_SAMESITE    = 'Lax'
CSRF_COOKIE_SECURE      = False
# Make sure Django doesn't strip the __cb_refresh cookie on non-HTTPS in dev
SIMPLE_JWT_COOKIE_SECURE = False

# ── v32 Fix: JWT algorithm mismatch — always inherit base.py algorithm + keys ──
# Problem: dev.py was re-detecting the algorithm from JWT_PRIVATE_KEY env var
# (which is empty in .env), concluding HS256 — while base.py had already loaded
# the RSA certs from backend/certs/ and set SIGNING_KEY to an RSA PEM string.
# Using an RSA key with the HMAC HS256 algorithm raises:
#   jwt.exceptions.InvalidKeyError: The specified key is an asymmetric key ...
#   → 500 Internal Server Error on every login and signup.
#
# Fix: Remove the algorithm re-detection. Trust base.py's _JWT_ALGORITHM /
# _JWT_SIGNING_KEY / _JWT_VERIFYING_KEY which are already consistent:
#   - RS256 + RSA keys  when backend/certs/ PEM files exist (default dev setup)
#   - HS256 + SECRET_KEY when no keys exist (bare environment without certs)
# The '**SIMPLE_JWT' spread already inherits the correct algorithm + key pair.
from datetime import timedelta as _td

SIMPLE_JWT = {
    **SIMPLE_JWT,                          # inherit base.py algorithm + signing/verifying keys
    # ↑ Do NOT override ALGORITHM here — base.py already resolved it correctly.
    # Overriding with a hard-coded value risks mismatching the inherited SIGNING_KEY.
    'ACCESS_TOKEN_LIFETIME':  _td(hours=4),  # longer lifetime for dev comfort
    'REFRESH_TOKEN_LIFETIME': _td(days=7),
    'ROTATE_REFRESH_TOKENS':  False,
    'BLACKLIST_AFTER_ROTATION': False,
    # Cookie config — must match what apiClient.jsx uses
    'AUTH_COOKIE':            '__cb_refresh',
    'AUTH_COOKIE_SECURE':     False,       # no HTTPS in dev
    'AUTH_COOKIE_SAMESITE':   'Lax',       # allows Vite dev server (cross-origin)
    'AUTH_COOKIE_HTTP_ONLY':  True,        # prevent JS access to refresh token
    'AUTH_COOKIE_PATH':       '/',
    'AUTH_HEADER_TYPES':      ('Bearer',),
}

# ─────────────────────────────────────────────
# Database — local PostgreSQL
# ─────────────────────────────────────────────
import os as _os
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     _os.environ.get('DB_NAME',     'curabook_db'),
        'USER':     _os.environ.get('DB_USER',     'curabook_user'),
        'PASSWORD': _os.environ.get('DB_PASSWORD', 'curabook_dev_pass'),
        'HOST':     _os.environ.get('DB_HOST',     'localhost'),
        'PORT':     _os.environ.get('DB_PORT',     '5432'),
        'OPTIONS':  {'connect_timeout': 10},
        'CONN_MAX_AGE': 60,
    }
}

# ─────────────────────────────────────────────
# Email — handled in base.py via env-vars
# ─────────────────────────────────────────────
# EMAIL_BACKEND defaults to console.EmailBackend in base.py.
# To test real SMTP in dev, add to your .env:
#   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
#   EMAIL_HOST=smtp.gmail.com
#   EMAIL_PORT=587
#   EMAIL_HOST_USER=your@email.com
#   EMAIL_HOST_PASSWORD=your_app_password

# ─────────────────────────────────────────────
# Django Debug Toolbar (optional, install separately)
# ─────────────────────────────────────────────
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
# INTERNAL_IPS = ['127.0.0.1']

# ─────────────────────────────────────────────
# Celery — eager mode (no worker needed in dev)
# Set to False if you want to test with real worker
# ─────────────────────────────────────────────
CELERY_TASK_ALWAYS_EAGER  = False
CELERY_TASK_EAGER_PROPAGATES = True

# ─────────────────────────────────────────────
# Cache — local memory (no Redis needed in dev)
# Switch to Redis if testing real cache behavior
# ─────────────────────────────────────────────
import os as _os_cache
_REDIS_HOST     = _os_cache.environ.get('REDIS_HOST', '')
_REDIS_PORT     = _os_cache.environ.get('REDIS_PORT', '6379')
_REDIS_PASSWORD = _os_cache.environ.get('REDIS_PASSWORD', '')
_REDIS_CACHE_URL = (
    f'redis://:{_REDIS_PASSWORD}@{_REDIS_HOST}:{_REDIS_PORT}/1'
    if _REDIS_PASSWORD
    else f'redis://{_REDIS_HOST}:{_REDIS_PORT}/1'
)
CACHES = {
    'default': {
        'BACKEND':  'django_redis.cache.RedisCache' if _REDIS_HOST else 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': _REDIS_CACHE_URL if _REDIS_HOST else '',
        'OPTIONS':  {'CLIENT_CLASS': 'django_redis.client.DefaultClient'} if _REDIS_HOST else {},
    }
}

# ─────────────────────────────────────────────
# Throttle — relaxed for dev (all scopes unlimited)
# ─────────────────────────────────────────────
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_CLASSES': [],   # ✅ FIX: disable throttling entirely in dev
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {}),
        # Dev overrides — no limits during development/testing
        'anon':           '9999/minute',
        'user':           '9999/minute',
        'login':          '9999/minute',
        'register':       '9999/minute',
        'password_reset': '9999/minute',
        'booking':        '9999/minute',
        'search':         '9999/minute',
        'search_auth':    '9999/minute',
        'ws_connect':     '9999/minute',
        'dashboard':      '9999/minute',
    },
}

# ─────────────────────────────────────────────
# Logging — verbose in dev
# ─────────────────────────────────────────────
LOGGING['loggers']['curabook']['level'] = 'DEBUG'
LOGGING['root']['level'] = 'DEBUG'


# ─────────────────────────────────────────────
# ✅ FIX #31: django-silk — SQL Query Monitoring
# Dashboard available at: http://localhost:8000/silk/
# Shows: request timeline, SQL query count, slow queries, duplicate queries
#
# Usage:
#   1. Run: pip install django-silk
#   2. Run: python manage.py migrate  (creates silk_* tables)
#   3. Visit /silk/ in your browser
#
# Configuration:
#   SILKY_PYTHON_PROFILER = True    → enables cProfile per-request
#   SILKY_MAX_RECORDED_REQUESTS = 100 → keep last 100 requests in DB
#
# ⚠️  Never enable in production — exposes all SQL queries.
# ─────────────────────────────────────────────
try:
    import silk  # noqa: F401  — only available when django-silk is installed
    INSTALLED_APPS += ['silk']  # type: ignore[name-defined]
    MIDDLEWARE = [
        'silk.middleware.SilkyMiddleware',  # ← must be early to capture all queries
    ] + MIDDLEWARE  # type: ignore[name-defined]

    SILKY_PYTHON_PROFILER      = False  # Disabled: cProfile not thread-safe with concurrent requests
    SILKY_MAX_RECORDED_REQUESTS = 100          # keep last N requests
    SILKY_MAX_RECORDED_REQUESTS_CHECK_PERCENT = 10

    # Only staff users can access /silk/ dashboard
    SILKY_AUTHENTICATION = True
    SILKY_AUTHORISATION  = True  # requires is_staff = True

    # Exclude monitoring/infra endpoints — no point recording Prometheus scrapes or healthchecks
    SILKY_INTERCEPT_FUNC = lambda request: not request.path.startswith(('/metrics', '/api/v1/health/'))
except ImportError:
    # django-silk not installed — skip silently (run: pip install django-silk to enable)
    pass

# ─────────────────────────────────────────────
# F-12: JWT in development
# ─────────────────────────────────────────────
# Dev uses RS256 automatically if backend/certs/ keys exist (generated by
# `python scripts/generate_jwt_keys.py`). Falls back to HS256 with a warning
# if keys are missing — acceptable for local dev only.
# Production ALWAYS requires RS256 (enforced in prod.py).


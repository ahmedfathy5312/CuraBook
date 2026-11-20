"""
CuraBook — Test Settings
==========================
Extends base settings for CI/CD test environment.
Faster, uses test DB, disables unnecessary services.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# ── Database ────────────────────────────────────────────────────────────────
import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        # Accept both DB_* (CI workflow) and POSTGRES_* (legacy / docker-compose) conventions
        "NAME":     os.environ.get("DB_NAME",     os.environ.get("POSTGRES_DB",       "curabook_test")),
        "USER":     os.environ.get("DB_USER",     os.environ.get("POSTGRES_USER",     "curabook")),
        "PASSWORD": os.environ.get("DB_PASSWORD", os.environ.get("POSTGRES_PASSWORD", "curabook_secret")),
        "HOST":     os.environ.get("DB_HOST",     os.environ.get("POSTGRES_HOST",     "localhost")),
        "PORT":     os.environ.get("DB_PORT",     os.environ.get("POSTGRES_PORT",     "5432")),
        "TEST":   {"NAME": "curabook_test"},
    }
}

# ── Caching ─────────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        # Accept REDIS_URL (docker-compose) or build from REDIS_HOST/REDIS_PORT (CI)
        "LOCATION": os.environ.get(
            "REDIS_URL",
            "redis://{}:{}/1".format(
                os.environ.get("REDIS_HOST", "localhost"),
                os.environ.get("REDIS_PORT", "6379"),
            ),
        ),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

# ── Celery ──────────────────────────────────────────────────────────────────
CELERY_TASK_ALWAYS_EAGER = True   # run tasks synchronously in tests
CELERY_TASK_EAGER_PROPAGATES = True

# ── Media / Storage ──────────────────────────────────────────────────────────
DEFAULT_FILE_STORAGE = "django.core.files.storage.InMemoryStorage"

# ── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ── Password hashing ─────────────────────────────────────────────────────────
# Use fast hasher in tests to speed up User.objects.create_user()
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
}

# ── Silk (query profiling) ────────────────────────────────────────────────────
# Disable in tests
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "silk"]
MIDDLEWARE = [mw for mw in MIDDLEWARE if "SilkyMiddleware" not in mw]

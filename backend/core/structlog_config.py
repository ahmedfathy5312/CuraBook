"""
CuraBook — Structlog Configuration
=====================================
Structured JSON logging for production observability.
Integrates with Django's standard logging system.

Usage:
    import structlog
    logger = structlog.get_logger("curabook.appointments")
    logger.info("appointment_created", appointment_id=42, patient_id=7)

Log format (production JSON):
    {
        "timestamp": "2024-01-15T10:30:00Z",
        "level": "info",
        "event": "appointment_created",
        "appointment_id": 42,
        "patient_id": 7,
        "logger": "curabook.appointments",
        "request_id": "abc123"
    }

Call configure_structlog() in Django's AppConfig.ready() or at the bottom of settings.
"""

import os
import logging


def configure_structlog(json_output: bool = None):
    """
    Configure structlog with appropriate processors for the environment.

    Args:
        json_output: Force JSON output (True=JSON, False=colored, None=auto from env)
    """
    try:
        import structlog
    except ImportError:
        logging.getLogger("curabook").warning(
            "[Structlog] structlog not installed. "
            "Run: pip install structlog. Falling back to standard logging."
        )
        return

    if json_output is None:
        # Auto-detect: JSON in production, colored in development
        json_output = os.environ.get('DJANGO_ENV', 'development') == 'production'

    # ─── Shared processors (both dev and prod) ───
    shared_processors = [
        structlog.contextvars.merge_contextvars,          # Thread-local context
        structlog.stdlib.add_logger_name,                 # Logger name
        structlog.stdlib.add_log_level,                   # Level string
        structlog.processors.TimeStamper(fmt="iso"),      # ISO timestamp
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if json_output:
        # ─── Production: JSON output ─────────────────
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # ─── Development: colored console output ─────
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


# ─────────────────────────────────────────────
# Request ID context binding
# ─────────────────────────────────────────────

def bind_request_context(request_id: str, user_id: int = None, path: str = None):
    """
    Bind context variables to structlog for the current request.
    Call from middleware at the start of each request.

    All subsequent structlog calls in this request will automatically
    include these fields.
    """
    try:
        import structlog
        structlog.contextvars.clear_contextvars()
        ctx = {"request_id": request_id}
        if user_id:
            ctx["user_id"] = user_id
        if path:
            ctx["path"] = path
        structlog.contextvars.bind_contextvars(**ctx)
    except ImportError:
        pass


def clear_request_context():
    """Clear structlog context at end of request."""
    try:
        import structlog
        structlog.contextvars.clear_contextvars()
    except ImportError:
        pass

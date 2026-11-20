"""
CuraBook — Structured Logging Filters
=======================================
Adds request_id to every log record so it appears in ALL log lines,
not just the audit middleware line.

Usage — add to LOGGING in settings/base.py:
    'filters': {
        'request_id': {
            '()': 'core.logging_filters.RequestIDFilter',
        }
    }
    Add 'filters': ['request_id'] to each handler.

Then update formatter to include %(request_id)s.
"""

import logging
import threading

_local = threading.local()


def set_request_id(request_id: str):
    """Called by RequestIDMiddleware to store request_id in thread-local."""
    _local.request_id = request_id


def get_request_id() -> str:
    return getattr(_local, 'request_id', '-')


class RequestIDFilter(logging.Filter):
    """Injects request_id into every log record."""

    def filter(self, record):
        record.request_id = get_request_id()
        return True

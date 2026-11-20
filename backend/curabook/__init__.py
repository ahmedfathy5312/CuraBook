"""
CuraBook Django project.
Celery app is loaded here so it's available project-wide.
"""

from .celery import app as celery_app

__all__ = ('celery_app',)

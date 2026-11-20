"""
CuraBook — Users Services
==========================
Service layer for all user-related business operations.

Modules:
    registration_service  — user registration, role setup, profile creation
    document_service      — document upload and management
"""

from .registration_service import register_user
from .document_service import create_document

__all__ = [
    "register_user",
    "create_document",
]

"""
CuraBook — Document Service
============================
Handles document upload business logic.
Extracted from DocumentSerializer.create().
"""

from django.contrib.auth import get_user_model

from users.models import Document

User = get_user_model()


def create_document(*, owner: User, file, **kwargs) -> Document:
    """
    Create a Document owned by the given user.

    Args:
        owner   — the User instance making the upload
        file    — uploaded file object
        **kwargs — any additional Document fields

    Returns:
        Newly created Document instance.
    """
    return Document.objects.create(owner=owner, file=file, **kwargs)

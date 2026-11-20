"""
CuraBook — Accounts Selectors
================================
All User queries centralized. Never write raw User queries in views.
"""

from __future__ import annotations
from typing import Optional
from django.contrib.auth import get_user_model

User = get_user_model()


def get_active_user_by_id(user_id: int) -> Optional[User]:
    return User.objects.filter(pk=user_id, is_active=True, is_deleted=False).first()


def get_active_user_by_email(email: str) -> Optional[User]:
    return User.objects.filter(
        email__iexact=email, is_active=True, is_deleted=False
    ).first()


def get_active_user_by_username(username: str) -> Optional[User]:
    return User.objects.filter(
        username=username, is_active=True, is_deleted=False
    ).first()


def get_all_active_users(role: str = None):
    qs = User.objects.filter(is_active=True, is_deleted=False)
    if role:
        qs = qs.filter(role=role)
    return qs.order_by("-date_joined")

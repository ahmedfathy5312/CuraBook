"""
CuraBook — Doctors Selectors
==============================
All doctor queries centralized here.
"""

from __future__ import annotations
from typing import Optional
from django.db.models import QuerySet, Avg, Count

from .models import DoctorProfile


def get_doctor_profile_by_user(user) -> Optional[DoctorProfile]:
    return (
        DoctorProfile.objects
        .select_related("user")
        .filter(user=user, user__is_deleted=False)
        .first()
    )


def get_doctor_profile_by_slug(slug: str) -> Optional[DoctorProfile]:
    return (
        DoctorProfile.objects
        .select_related("user")
        .filter(slug=slug, user__is_active=True, user__is_deleted=False)
        .first()
    )


def get_all_active_doctors() -> QuerySet:
    return (
        DoctorProfile.objects
        .select_related("user")
        .filter(user__is_active=True, user__is_deleted=False, accepts_booking=True)
        .annotate(
            avg_rating=Avg("user__reviews_received__rating"),
            review_count=Count("user__reviews_received"),
        )
    )


def get_doctor_full_profile(user) -> Optional[DoctorProfile]:
    """Full profile with schedule and clinic data — for dashboard."""
    return (
        DoctorProfile.objects
        .select_related("user")
        .prefetch_related(
            "user__schedules__clinic",
            "user__schedules__hospital",
            "user__hospital_doctor_links__hospital",
            "user__hospital_doctor_links__department",
        )
        .filter(user=user, user__is_deleted=False)
        .first()
    )

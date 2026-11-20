"""
CuraBook — Common Base Models
==============================
Provides reusable abstract base models for all domain models.

Hierarchy:
    TimestampedModel   — created_at + updated_at
    SoftDeleteModel    — is_deleted + deleted_at + managers (from soft_delete.py)
    BaseModel          — UUID PK + SoftDelete + Timestamps  ← RECOMMENDED DEFAULT
    PublicIdMixin      — adds public_id to LEGACY integer-PK models (migration bridge)

Migration Strategy for EXISTING integer-PK models:
    Existing models already have PublicIdMixin applied (v5/v6 sessions).
    They expose public_id in serializers instead of integer id.
    Full PK swap is a future maintenance-window task (requires FK migration).

    For ALL NEW models: subclass BaseModel directly — UUID PK out of the box.

Usage:
    # New model — UUID PK, soft-delete, timestamps:
    class MedicalRecord(BaseModel):
        ...
        class Meta(BaseModel.Meta):
            ordering = ['-created_at']

    # Legacy bridge for existing integer-PK models:
    class Appointment(PublicIdMixin, LegacyIntModel):
        public_id = ...  # already added via PublicIdMixin
"""

import uuid

from django.db import models
from .soft_delete import SoftDeleteModel


# ─────────────────────────────────────────────────────────────────────────────
# TimestampedModel
# ─────────────────────────────────────────────────────────────────────────────

class TimestampedModel(models.Model):
    """
    Abstract base that adds audit timestamps to any child model.

    Fields:
        created_at  — auto-set on first save (never changes)
        updated_at  — auto-updated on every save
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        null=True,   # ✅ keeps existing NULL rows happy during migration
        blank=True,
        help_text="Timestamp when this record was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        null=True,   # ✅ keeps existing NULL rows happy during migration
        blank=True,
        help_text="Timestamp when this record was last updated.",
    )

    class Meta:
        abstract = True


# ─────────────────────────────────────────────────────────────────────────────
# BaseModel  ← MAIN base for ALL domain models (UUID PK + SoftDelete + Timestamps)
# ─────────────────────────────────────────────────────────────────────────────

class BaseModel(SoftDeleteModel, TimestampedModel):
    """
    Enterprise-grade abstract base for all CuraBook domain models.

    Fields:
        id          — UUID primary key (non-guessable, globally unique)
        is_deleted  — soft-delete flag
        deleted_at  — soft-delete timestamp
        created_at  — creation timestamp
        updated_at  — last update timestamp

    Why UUID as PK (not integer)?
        • Prevents sequential ID enumeration attacks (/api/v1/patient/1, 2, 3 …)
        • Safe for distributed systems — IDs can be generated client-side
        • Globally unique across tables, databases, and services
        • Enables event sourcing and multi-tenant architectures

    Managers (inherited from SoftDeleteModel):
        objects      → excludes soft-deleted rows (default)
        all_objects  → includes everything (admin / migrations)

    Usage:
        class Appointment(BaseModel):
            ...
            class Meta(BaseModel.Meta):
                ordering = ['-created_at']
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="UUID primary key — globally unique, non-guessable.",
    )

    class Meta(SoftDeleteModel.Meta):
        abstract = True


# ─────────────────────────────────────────────────────────────────────────────
# UUIDModel  — alias kept for backward-compat (≡ BaseModel)
# ─────────────────────────────────────────────────────────────────────────────

# Some modules imported UUIDModel by name in v5.  Keep the alias so those
# imports don't break while we gradually migrate them to BaseModel.
UUIDModel = BaseModel


# ─────────────────────────────────────────────────────────────────────────────
# PublicIdMixin  — zero-downtime bridge for EXISTING integer-PK models
# ─────────────────────────────────────────────────────────────────────────────

class PublicIdMixin(models.Model):
    """
    Adds a `public_id` UUID field alongside an existing integer primary key.

    This is the ZERO-DOWNTIME migration path for models that already have
    integer primary keys and live foreign-key relationships.

    Phase 1 (done in v5/v6): add public_id alongside existing integer PK.
    Phase 2 (done in v6):    expose public_id in all serializers.
    Phase 3 (future):        swap PK after all clients are updated (needs maintenance window).

    Usage:
        class Appointment(PublicIdMixin, LegacyIntModel):
            ...
    """

    public_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Stable public UUID — use this in API responses instead of integer id.",
    )

    class Meta:
        abstract = True

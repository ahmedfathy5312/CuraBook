"""
CuraBook — Common SoftDelete Infrastructure
============================================
Provides:
  • SoftDeleteQuerySet   — filters deleted rows by default
  • SoftDeleteManager    — default manager using SoftDeleteQuerySet
  • SoftDeleteModel      — abstract base model (is_deleted + deleted_at)

Usage:
    class Clinic(SoftDeleteModel):
        ...

    # Soft-delete a record (does NOT hit DB DELETE)
    clinic.delete()

    # Hard-delete (bypasses soft delete — use with caution)
    clinic.hard_delete()

    # Query only non-deleted records (default)
    Clinic.objects.all()

    # Query including deleted records (admin/audit only)
    Clinic.objects.with_deleted().filter(name='x')

    # Query only deleted records
    Clinic.objects.deleted_only()
"""

from django.db import models
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# QuerySet
# ─────────────────────────────────────────────────────────────────────────────

class SoftDeleteQuerySet(models.QuerySet):
    """
    Default queryset hides soft-deleted rows.
    Call .with_deleted() or .deleted_only() to bypass.
    """

    def delete(self):
        """Bulk soft-delete: stamp all matched rows instead of deleting."""
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        """Bypass soft delete — permanent SQL DELETE."""
        return super().delete()

    def with_deleted(self):
        """Return queryset that includes soft-deleted rows."""
        return self.model._default_manager.with_deleted().filter(
            pk__in=self.values_list('pk', flat=True)
        )

    def deleted_only(self):
        """Return only soft-deleted rows."""
        return self.model._default_manager.deleted_only().filter(
            pk__in=self.values_list('pk', flat=True)
        )


# ─────────────────────────────────────────────────────────────────────────────
# Manager
# ─────────────────────────────────────────────────────────────────────────────

class SoftDeleteManager(models.Manager):
    """
    Default manager: automatically excludes soft-deleted rows.
    Provides .with_deleted() and .deleted_only() for admin/audit use.
    """

    def get_queryset(self) -> models.QuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            is_deleted=False
        )

    def with_deleted(self) -> models.QuerySet:
        """All rows, including soft-deleted."""
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self) -> models.QuerySet:
        """Only soft-deleted rows."""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            is_deleted=True
        )


# ─────────────────────────────────────────────────────────────────────────────
# Abstract Base Model
# ─────────────────────────────────────────────────────────────────────────────

class SoftDeleteModel(models.Model):
    """
    Abstract base model — adds soft-delete columns and behaviour.

    Fields added:
      is_deleted  BooleanField  — True means the record is logically deleted
      deleted_at  DateTimeField — when it was deleted (null if not deleted)

    Managers:
      objects       → SoftDeleteManager  (hides deleted rows by default)
      all_objects   → raw Manager        (shows everything — use in admin)
    """

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft-delete flag. True = logically deleted."
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the record was soft-deleted."
    )

    objects     = SoftDeleteManager()
    all_objects = models.Manager()          # bypass for admin/migrations

    class Meta:
        abstract = True

    # ──────────────────────────────────────
    # Instance-level soft delete
    # ──────────────────────────────────────

    def delete(self, using=None, keep_parents=False):
        """
        Soft-delete: stamp is_deleted=True + deleted_at instead of SQL DELETE.
        Emits no post_delete signal (by design — use a custom signal if needed).
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanent SQL DELETE — bypasses soft delete."""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Un-delete a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def __str__(self):
        deleted_tag = ' [DELETED]' if self.is_deleted else ''
        return f'{self.__class__.__name__} #{self.pk}{deleted_tag}'

"""
CuraBook — Locations Models
============================
City / Governorate reference data for Egypt.
Used by search filters and address fields across the platform.
"""

from django.db import models


class Governorate(models.Model):
    """Top-level administrative division (e.g. Cairo, Giza)."""
    name_ar = models.CharField(max_length=100, verbose_name="Arabic Name")
    name_en = models.CharField(max_length=100, verbose_name="English Name")
    slug    = models.SlugField(unique=True)
    order   = models.PositiveSmallIntegerField(default=0, help_text="Display order")

    class Meta:
        ordering = ["order", "name_en"]
        verbose_name = "Governorate"
        verbose_name_plural = "Governorates"

    def __str__(self):
        return self.name_en


class City(models.Model):
    """
    City / District within a Governorate.
    Used as the primary city reference across Doctor, Hospital, Clinic models.
    """
    governorate = models.ForeignKey(
        Governorate,
        on_delete=models.CASCADE,
        related_name="cities",
        null=True, blank=True,
    )
    name_ar = models.CharField(max_length=150, verbose_name="Arabic Name")
    name_en = models.CharField(max_length=150, verbose_name="English Name")
    slug    = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name_en"]
        verbose_name = "City"
        verbose_name_plural = "Cities"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name_en

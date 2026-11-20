"""
CuraBook — Departments Domain
==============================
Medical department within a hospital.
Doctors are linked to departments via HospitalDoctor (hospitals app).
"""

from django.db import models


class Department(models.Model):
    hospital = models.ForeignKey(
        "hospital.Hospital",
        on_delete=models.CASCADE,
        related_name="app_departments",
    )
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        unique_together     = ("hospital", "name")
        verbose_name        = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return f"{self.name} — {self.hospital.name}"

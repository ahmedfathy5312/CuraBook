"""
CuraBook — users.models (Deprecated Compatibility Shim)
=========================================================
⚠️  DO NOT add new code here.

This file re-exports models from the new domain apps for backward compatibility.
All new code should import directly from the domain apps:

    from apps.accounts.models  import User
    from apps.doctors.models   import DoctorProfile
    from apps.patients.models  import PatientProfile
    from apps.assistants.models import AssistantProfile
"""

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


def user_directory_path(instance, filename):
    return f"documents/user_{instance.owner_id}/{filename}"


def validate_file_size(value):
    limit = 10 * 1024 * 1024  # 10 MB
    if value.size > limit:
        from django.core.exceptions import ValidationError
        raise ValidationError("File size must not exceed 10 MB.")


from apps.accounts.models   import User                             # noqa: F401
from apps.doctors.models    import DoctorProfile                   # noqa: F401
from apps.patients.models   import PatientProfile                  # noqa: F401
from apps.assistants.models import AssistantProfile                # noqa: F401


class Document(models.Model):
    """User-uploaded documents (medical records, IDs, certificates, etc.)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    file = models.FileField(
        upload_to=user_directory_path,
        validators=[
            FileExtensionValidator(["pdf", "doc", "docx", "jpg", "png"]),
            validate_file_size,
        ],
    )
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    description  = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Document({self.owner_id}) — {self.file.name}"


__all__ = ["User", "DoctorProfile", "PatientProfile", "AssistantProfile", "Document"]

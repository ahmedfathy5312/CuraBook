"""
common/validators.py
File upload validators for CuraBook.

FIX Security: extension check alone is insufficient — a malicious file can have
a valid extension (e.g. .jpg) but contain executable content.
This module adds MIME type sniffing from file magic bytes using python-magic.

Usage:
    from common.validators import validate_image_upload, validate_document_upload

    class MyModel(models.Model):
        avatar = models.ImageField(
            upload_to='avatars/',
            validators=[validate_image_upload],
        )
"""

import os
import logging

from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

logger = logging.getLogger(__name__)


# ─── MIME type maps ────────────────────────────────────────────────────────────

ALLOWED_IMAGE_MIMES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
}

ALLOWED_DOCUMENT_MIMES = {
    'application/pdf',
    'application/msword',                                                  # .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'image/jpeg',
    'image/png',
}

ALLOWED_IMAGE_EXTENSIONS    = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'}

MAX_IMAGE_SIZE_MB    = 5
MAX_DOCUMENT_SIZE_MB = 10


# ─── Magic byte detection ──────────────────────────────────────────────────────

def _detect_mime(file_obj) -> str:
    """
    Detect MIME type from file magic bytes.
    Falls back to 'application/octet-stream' if python-magic is not installed.
    """
    try:
        import magic  # python-magic
        file_obj.seek(0)
        header = file_obj.read(2048)
        file_obj.seek(0)
        return magic.from_buffer(header, mime=True)
    except ImportError:
        # python-magic not installed — log warning and skip magic byte check
        logger.warning(
            "python-magic not installed. File upload magic byte validation is disabled. "
            "Run: pip install python-magic"
        )
        return 'application/octet-stream'
    except Exception as exc:
        logger.error("Magic byte detection failed: %s", exc)
        return 'application/octet-stream'


# ─── Validators ───────────────────────────────────────────────────────────────

@deconstructible
class FileValidator:
    """
    Generic file validator: checks extension + size + magic bytes.

    Args:
        allowed_extensions: set of lowercase extensions including dot (e.g. {'.jpg', '.png'})
        allowed_mimes:      set of allowed MIME types
        max_size_mb:        maximum file size in megabytes
    """

    def __init__(self, allowed_extensions, allowed_mimes, max_size_mb):
        self.allowed_extensions = allowed_extensions
        self.allowed_mimes      = allowed_mimes
        self.max_size_bytes     = max_size_mb * 1024 * 1024

    def __call__(self, file):
        # 1. Extension check
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.allowed_extensions:
            raise ValidationError(
                f"File type '{ext}' is not allowed. "
                f"Allowed types: {', '.join(sorted(self.allowed_extensions))}"
            )

        # 2. Size check
        if hasattr(file, 'size') and file.size > self.max_size_bytes:
            raise ValidationError(
                f"File size {file.size / (1024*1024):.1f}MB exceeds the "
                f"{self.max_size_bytes / (1024*1024):.0f}MB limit."
            )

        # 3. Magic byte check (FIX Security: prevents extension spoofing)
        detected_mime = _detect_mime(file)
        if (
            detected_mime != 'application/octet-stream'   # magic available
            and detected_mime not in self.allowed_mimes
        ):
            raise ValidationError(
                f"File content does not match its extension. "
                f"Detected type: {detected_mime}. "
                f"This file may have been tampered with."
            )

    def __eq__(self, other):
        return (
            isinstance(other, FileValidator)
            and self.allowed_extensions == other.allowed_extensions
            and self.allowed_mimes == other.allowed_mimes
            and self.max_size_bytes == other.max_size_bytes
        )


# ─── Ready-to-use validator instances ─────────────────────────────────────────

#: Use for profile images and any image upload field
validate_image_upload = FileValidator(
    allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
    allowed_mimes=ALLOWED_IMAGE_MIMES,
    max_size_mb=MAX_IMAGE_SIZE_MB,
)

#: Use for documents (PDFs, Word files, images)
validate_document_upload = FileValidator(
    allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
    allowed_mimes=ALLOWED_DOCUMENT_MIMES,
    max_size_mb=MAX_DOCUMENT_SIZE_MB,
)

"""
CuraBook — File Storage Abstraction Layer
==========================================
Supports Local / AWS S3 / MinIO storage backends.
Backend is selected via STORAGE_BACKEND environment variable.

Settings (in base.py / env):
    STORAGE_BACKEND=local      → local filesystem (development)
    STORAGE_BACKEND=s3         → AWS S3 (production)
    STORAGE_BACKEND=minio      → MinIO (self-hosted S3-compatible)

For S3 / MinIO, also set:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_STORAGE_BUCKET_NAME
    AWS_S3_ENDPOINT_URL        (MinIO only)
    AWS_S3_REGION_NAME

Usage:
    from infrastructure.storage import storage_backend
    url = storage_backend.url('path/to/file.pdf')
    storage_backend.save('uploads/doc.pdf', file_obj)
    storage_backend.delete('uploads/old.pdf')
"""

import os
import logging
from abc import ABC, abstractmethod
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Abstract Base
# ─────────────────────────────────────────────

class BaseStorageBackend(ABC):
    """Abstract interface all storage backends must implement."""

    @abstractmethod
    def save(self, name: str, content) -> str:
        """Save file content. Returns the final storage path."""

    @abstractmethod
    def url(self, name: str) -> str:
        """Returns the public URL for the given file path."""

    @abstractmethod
    def delete(self, name: str) -> None:
        """Deletes the file at the given path."""

    @abstractmethod
    def exists(self, name: str) -> bool:
        """Returns True if a file exists at the given path."""


# ─────────────────────────────────────────────
# Local Backend
# ─────────────────────────────────────────────

class LocalStorageBackend(BaseStorageBackend):
    """
    Stores files on the local filesystem via Django's FileSystemStorage.
    For development and single-server deployments.
    """

    def __init__(self):
        from django.conf import settings
        self._storage = FileSystemStorage(
            location=str(settings.MEDIA_ROOT),
            base_url=settings.MEDIA_URL,
        )

    def save(self, name: str, content) -> str:
        return self._storage.save(name, content)

    def url(self, name: str) -> str:
        return self._storage.url(name)

    def delete(self, name: str) -> None:
        if self._storage.exists(name):
            self._storage.delete(name)

    def exists(self, name: str) -> bool:
        return self._storage.exists(name)


# ─────────────────────────────────────────────
# S3 Backend (AWS S3)
# ─────────────────────────────────────────────

class S3StorageBackend(BaseStorageBackend):
    """
    Stores files on AWS S3 using django-storages.
    Requires: pip install django-storages[s3] boto3

    Env vars:
        AWS_ACCESS_KEY_ID
        AWS_SECRET_ACCESS_KEY
        AWS_STORAGE_BUCKET_NAME
        AWS_S3_REGION_NAME          (e.g. 'us-east-1')
        AWS_S3_CUSTOM_DOMAIN        (optional CDN domain)
        AWS_DEFAULT_ACL             (default: private)
    """

    def __init__(self):
        try:
            from storages.backends.s3boto3 import S3Boto3Storage
        except ImportError:
            raise ImportError(
                "S3 storage requires django-storages[s3] and boto3. "
                "Run: pip install 'django-storages[s3]' boto3"
            )

        self._storage = S3Boto3Storage(
            bucket_name=os.environ['AWS_STORAGE_BUCKET_NAME'],
            region_name=os.environ.get('AWS_S3_REGION_NAME', 'us-east-1'),
            default_acl=os.environ.get('AWS_DEFAULT_ACL', 'private'),
            file_overwrite=False,
        )

    def save(self, name: str, content) -> str:
        return self._storage.save(name, content)

    def url(self, name: str) -> str:
        return self._storage.url(name)

    def delete(self, name: str) -> None:
        if self._storage.exists(name):
            self._storage.delete(name)

    def exists(self, name: str) -> bool:
        return self._storage.exists(name)


# ─────────────────────────────────────────────
# MinIO Backend (Self-hosted S3-compatible)
# ─────────────────────────────────────────────

class MinIOStorageBackend(S3StorageBackend):
    """
    Stores files on MinIO (S3-compatible self-hosted object storage).
    Extends S3Backend with endpoint override.

    Extra env vars:
        AWS_S3_ENDPOINT_URL        → MinIO endpoint (e.g. http://minio:9000)
        AWS_S3_ADDRESSING_STYLE    → path (for MinIO compatibility)
    """

    def __init__(self):
        try:
            from storages.backends.s3boto3 import S3Boto3Storage
        except ImportError:
            raise ImportError(
                "MinIO storage requires django-storages[s3] and boto3. "
                "Run: pip install 'django-storages[s3]' boto3"
            )

        self._storage = S3Boto3Storage(
            bucket_name=os.environ['AWS_STORAGE_BUCKET_NAME'],
            endpoint_url=os.environ['AWS_S3_ENDPOINT_URL'],
            access_key=os.environ['AWS_ACCESS_KEY_ID'],
            secret_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            default_acl=os.environ.get('AWS_DEFAULT_ACL', 'private'),
            addressing_style='path',   # Required for MinIO
            file_overwrite=False,
        )


# ─────────────────────────────────────────────
# Factory — selects backend from env
# ─────────────────────────────────────────────

def get_storage_backend() -> BaseStorageBackend:
    """
    Returns the appropriate storage backend based on STORAGE_BACKEND env var.
    Defaults to local storage.
    """
    backend_name = os.environ.get('STORAGE_BACKEND', 'local').lower()

    backends = {
        'local': LocalStorageBackend,
        's3':    S3StorageBackend,
        'minio': MinIOStorageBackend,
    }

    backend_class = backends.get(backend_name)
    if not backend_class:
        logger.warning(
            f"[Storage] Unknown STORAGE_BACKEND='{backend_name}'. "
            f"Falling back to local storage."
        )
        backend_class = LocalStorageBackend

    logger.info(f"[Storage] Using backend: {backend_class.__name__}")
    return backend_class()


# Singleton instance — import this in your code
storage_backend: BaseStorageBackend = get_storage_backend()

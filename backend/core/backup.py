"""
CuraBook — Automated Database Backup
======================================
Celery task يعمل daily backup للـ PostgreSQL.

الـ backup بيتحفظ في:
  1. /app/backups/ (داخل الـ container)
  2. S3/MinIO لو STORAGE_BACKEND=s3 أو minio (production)

Retention: آخر 30 backup بس — الأقدم بيتحذف تلقائياً.

Celery Beat schedule (في celery.py):
    daily-db-backup: كل يوم 03:00 UTC
"""

import os
import subprocess
import logging
import gzip
from datetime import datetime, timedelta
from pathlib import Path

from celery import shared_task
from django.conf import settings

logger = logging.getLogger('curabook.backup')

BACKUP_DIR = Path(getattr(settings, 'BACKUP_DIR', '/app/backups'))
BACKUP_RETENTION = int(getattr(settings, 'BACKUP_RETENTION_DAYS', 30))


def _get_db_config() -> dict:
    db = settings.DATABASES['default']
    return {
        'name':     db.get('NAME', os.environ.get('DB_NAME', 'curabook_db')),
        'user':     db.get('USER', os.environ.get('DB_USER', 'curabook_user')),
        'password': db.get('PASSWORD', os.environ.get('DB_PASSWORD', '')),
        'host':     db.get('HOST', os.environ.get('DB_HOST', 'db')),
        'port':     db.get('PORT', os.environ.get('DB_PORT', '5432')),
    }


def _upload_to_s3(local_path: Path, s3_key: str) -> bool:
    """يرفع الـ backup على S3/MinIO لو مضبوط."""
    storage_backend = getattr(settings, 'STORAGE_BACKEND', 'local')
    if storage_backend not in ('s3', 'minio'):
        return False
    try:
        import boto3
        s3 = boto3.client(
            's3',
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', ''),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', ''),
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
            endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
        )
        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'curabook-media')
        s3.upload_file(str(local_path), bucket, f'backups/{s3_key}')
        logger.info('[Backup] Uploaded to S3: backups/%s', s3_key)
        return True
    except Exception as exc:
        logger.error('[Backup] S3 upload failed: %s', exc)
        return False


def _cleanup_old_backups():
    """يحذف الـ backups الأقدم من BACKUP_RETENTION_DAYS."""
    if not BACKUP_DIR.exists():
        return
    cutoff = datetime.now() - timedelta(days=BACKUP_RETENTION)
    removed = 0
    for f in BACKUP_DIR.glob('curabook_backup_*.gz'):
        if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
            f.unlink()
            removed += 1
    if removed:
        logger.info('[Backup] Cleaned up %d old backups', removed)


@shared_task(name='core.backup.daily_database_backup', bind=True, max_retries=2)
def daily_database_backup(self):
    """
    Task رئيسي — يعمل pg_dump ويحفظ الـ backup.
    بيتشغّل كل يوم 03:00 UTC من الـ Celery Beat.
    """
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename  = f'curabook_backup_{timestamp}.sql.gz'
    local_path = BACKUP_DIR / filename

    db = _get_db_config()

    env = os.environ.copy()
    env['PGPASSWORD'] = db['password']

    cmd = [
        'pg_dump',
        f'--host={db["host"]}',
        f'--port={db["port"]}',
        f'--username={db["user"]}',
        '--format=plain',
        '--no-password',
        db['name'],
    ]

    logger.info('[Backup] Starting daily backup → %s', filename)

    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            timeout=300,  # 5 minutes max
        )
        if result.returncode != 0:
            err = result.stderr.decode('utf-8', errors='replace')
            logger.error('[Backup] pg_dump failed: %s', err)
            raise self.retry(exc=RuntimeError(f'pg_dump failed: {err}'), countdown=60)

        # Compress
        with gzip.open(local_path, 'wb') as gz:
            gz.write(result.stdout)

        size_mb = local_path.stat().st_size / (1024 * 1024)
        logger.info('[Backup] ✅ Backup saved: %s (%.1f MB)', filename, size_mb)

        # Upload to S3/MinIO if configured
        _upload_to_s3(local_path, filename)

        # Cleanup old backups
        _cleanup_old_backups()

        return {
            'status':    'success',
            'filename':  filename,
            'size_mb':   round(size_mb, 2),
            'timestamp': timestamp,
        }

    except subprocess.TimeoutExpired:
        logger.error('[Backup] pg_dump timed out after 5 minutes')
        raise self.retry(exc=TimeoutError('pg_dump timeout'), countdown=120)
    except Exception as exc:
        logger.error('[Backup] Unexpected error: %s', exc)
        raise

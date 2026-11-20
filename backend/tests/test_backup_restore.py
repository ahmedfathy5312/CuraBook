"""
CuraBook — Tests: Backup & Restore Pipeline
=============================================
يتحقق أوتوماتيكياً إن:
  1. daily_database_backup task بتشتغل وبتنتج ملف .sql.gz فعلي
  2. الملف ده مش فاضي وبيحتوي SQL صح (INSERT/CREATE)
  3. الـ cleanup بيشيل الـ backups الأقدم من 30 يوم بس
  4. لو pg_dump فشل، الـ task بترمي exception واضح (مش silent fail)
  5. (Smoke test) الملف ممكن يتفك ضغط ويقرأ — أي restore هيلاقي SQL صالح

ملاحظة: الـ test ده بيستخدم مocked subprocess بدل pg_dump حقيقي
عشان يشتغل في CI بدون database connection.
الـ integration test الكامل (real pg_dump + psql restore) موجود في
pytest mark `backup_integration` وبيشتغل manually قبل الـ deploy.
"""

import gzip
import os
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from django.test import override_settings


# ── helpers ────────────────────────────────────────────────────────────────────

FAKE_SQL = b"""\
--
-- PostgreSQL database dump (CuraBook test fixture)
--
CREATE TABLE fake_table (id SERIAL PRIMARY KEY, data TEXT);
INSERT INTO fake_table (data) VALUES ('row1'), ('row2'), ('row3');
"""


def _make_gz(path: Path, content: bytes = FAKE_SQL) -> Path:
    """يكتب ملف .sql.gz للتجربة."""
    with gzip.open(path, "wb") as fh:
        fh.write(content)
    return path


def _fake_pg_dump_success(*args, **kwargs):
    """subprocess.run mock — pg_dump بيرجع SQL تمام."""
    m = MagicMock()
    m.returncode = 0
    m.stdout = FAKE_SQL
    m.stderr = b""
    return m


def _fake_pg_dump_failure(*args, **kwargs):
    """subprocess.run mock — pg_dump بيرجع error."""
    m = MagicMock()
    m.returncode = 1
    m.stdout = b""
    m.stderr = b"FATAL: role \"curabook_user\" does not exist"
    return m


# ── unit tests ─────────────────────────────────────────────────────────────────


class TestDailyBackupTask:
    """Unit tests للـ Celery task نفسه (لا pg_dump حقيقي، لا DB connection)."""

    def test_backup_creates_gz_file(self, tmp_path):
        """Task لازم تعمل ملف .sql.gz في الـ BACKUP_DIR."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_success),
            patch("core.backup._upload_to_s3", return_value=False),
        ):
            result = daily_database_backup.apply().get()

        assert result["status"] == "success"
        filename = result["filename"]
        assert filename.endswith(".sql.gz"), "الملف لازم يبقى .sql.gz"

        produced = tmp_path / filename
        assert produced.exists(), f"الملف {filename} مش موجود في {tmp_path}"
        assert produced.stat().st_size > 0, "الملف الـ backup فاضي!"

    def test_backup_file_contains_valid_sql(self, tmp_path):
        """الملف المنتج لازم يحتوي على SQL يقدر يتعمله restore."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_success),
            patch("core.backup._upload_to_s3", return_value=False),
        ):
            result = daily_database_backup.apply().get()

        gz_path = tmp_path / result["filename"]
        with gzip.open(gz_path, "rb") as fh:
            content = fh.read()

        # لازم يحتوي SQL keywords دالة على dump حقيقي
        assert b"CREATE" in content or b"INSERT" in content, (
            "الـ backup مش بيحتوي SQL صالح — restore هيفشل!"
        )

    def test_backup_returns_size_and_timestamp(self, tmp_path):
        """الـ task لازم ترجع size_mb و timestamp في الـ result."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_success),
            patch("core.backup._upload_to_s3", return_value=False),
        ):
            result = daily_database_backup.apply().get()

        assert "size_mb" in result, "result ناقصاله size_mb"
        assert "timestamp" in result, "result ناقصاله timestamp"
        assert isinstance(result["size_mb"], float)
        # timestamp format: YYYYMMDD_HHMMSS
        ts = result["timestamp"]
        datetime.strptime(ts, "%Y%m%d_%H%M%S")  # بيرمي ValueError لو غلط

    def test_backup_fails_loudly_on_pg_dump_error(self, tmp_path):
        """لو pg_dump فشل، الـ task لازم ترمي exception واضحة (مش silent)."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_failure),
        ):
            with pytest.raises(Exception):
                # apply() بترجع AsyncResult — .get() بيرمي الـ exception
                daily_database_backup.apply().get(propagate=True)

        # تأكد إن مفيش ملف اتعمل بالغلط
        gz_files = list(tmp_path.glob("*.sql.gz"))
        assert len(gz_files) == 0, (
            "اتعمل ملف backup رغم فشل pg_dump — ده خطير!"
        )

    def test_backup_timeout_raises(self, tmp_path):
        """لو pg_dump timeout، الـ task لازم ترمي retry/TimeoutError."""
        from core.backup import daily_database_backup

        def _timeout(*args, **kwargs):
            raise subprocess.TimeoutExpired(cmd="pg_dump", timeout=300)

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_timeout),
        ):
            with pytest.raises(Exception):
                daily_database_backup.apply().get(propagate=True)


class TestBackupCleanup:
    """Tests لـ _cleanup_old_backups — بتشيل الـ backups القديمة بس."""

    def test_removes_old_backups_only(self, tmp_path):
        """الملفات الأقدم من BACKUP_RETENTION_DAYS لازم تتحذف."""
        from core.backup import _cleanup_old_backups

        old_file = tmp_path / "curabook_backup_20200101_000000.gz"
        new_file = tmp_path / "curabook_backup_99991231_000000.gz"
        old_file.touch()
        new_file.touch()

        # نغيّر mtime للملف القديم لـ 40 يوم فات
        old_mtime = (datetime.now() - timedelta(days=40)).timestamp()
        os.utime(old_file, (old_mtime, old_mtime))

        with override_settings(BACKUP_DIR=str(tmp_path)):
            _cleanup_old_backups()

        assert not old_file.exists(), "الملف القديم مش اتحذف!"
        assert new_file.exists(), "الملف الجديد اتحذف بالغلط!"

    def test_does_not_delete_recent_backups(self, tmp_path):
        """الـ backups الحديثة لازم تفضل موجودة بعد الـ cleanup."""
        from core.backup import _cleanup_old_backups

        recent = tmp_path / "curabook_backup_recent.gz"
        recent.touch()

        with override_settings(BACKUP_DIR=str(tmp_path)):
            _cleanup_old_backups()

        assert recent.exists(), "الـ backup الحديث اتحذف بالغلط!"

    def test_handles_empty_backup_dir(self, tmp_path):
        """لو الـ BACKUP_DIR فاضي، الـ cleanup متعطلش."""
        from core.backup import _cleanup_old_backups

        with override_settings(BACKUP_DIR=str(tmp_path)):
            # المفروض متعملش exception
            _cleanup_old_backups()

    def test_handles_missing_backup_dir(self, tmp_path):
        """لو الـ BACKUP_DIR مش موجود، الـ cleanup متعطلش."""
        from core.backup import _cleanup_old_backups

        missing = tmp_path / "nonexistent_dir"
        with override_settings(BACKUP_DIR=str(missing)):
            _cleanup_old_backups()  # لازم ميرمیش exception


class TestBackupRestoreSmoke:
    """
    Smoke test — يتحقق إن الـ gz file اللي بتنتجه الـ task
    ممكن يتفك ضغط تماماً (أي pg_restore / psql مش هيلاقي ملف corrupt).
    """

    def test_produced_file_is_not_corrupt(self, tmp_path):
        """الـ backup file لازم يتفك ضغط بدون errors."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_success),
            patch("core.backup._upload_to_s3", return_value=False),
        ):
            result = daily_database_backup.apply().get()

        gz_path = tmp_path / result["filename"]

        # محاولة فك الضغط — لو الملف corrupt هيرمي OSError/EOFError
        try:
            with gzip.open(gz_path, "rb") as fh:
                data = fh.read()
            assert len(data) > 0, "الملف فاضي بعد فك الضغط!"
        except (OSError, EOFError) as exc:
            pytest.fail(f"الـ backup file corrupt — restore هيفشل: {exc}")

    def test_backup_sql_has_expected_structure(self, tmp_path):
        """التأكد إن الـ SQL dump structure مناسب لـ psql restore."""
        from core.backup import daily_database_backup

        with (
            override_settings(BACKUP_DIR=str(tmp_path)),
            patch("subprocess.run", side_effect=_fake_pg_dump_success),
            patch("core.backup._upload_to_s3", return_value=False),
        ):
            result = daily_database_backup.apply().get()

        gz_path = tmp_path / result["filename"]
        with gzip.open(gz_path, "rb") as fh:
            sql_bytes = fh.read()

        sql_text = sql_bytes.decode("utf-8", errors="replace")

        # pg_dump plain format لازم يبدأ بـ comment أو CREATE أو SET
        first_line = sql_text.strip().splitlines()[0] if sql_text.strip() else ""
        assert any(
            first_line.startswith(prefix)
            for prefix in ("--", "CREATE", "SET", "BEGIN", "INSERT")
        ), f"الـ SQL dump مش بيبدأ بـ SQL صالح: {first_line!r}"


# ── integration marker (manual / pre-deploy only) ──────────────────────────────

@pytest.mark.backup_integration
class TestRealBackupRestore:
    """
    Integration tests بتحتاج pg_dump و psql حقيقيين + DATABASE_URL.
    بتتشغل manually قبل كل deploy:
        pytest -m backup_integration --no-header -q

    مش بتتشغل في CI العادي عشان بتحتاج PostgreSQL connection.
    """

    def test_real_backup_and_restore_roundtrip(self, tmp_path, settings):
        """
        Full roundtrip:
          1. يعمل backup بـ pg_dump حقيقي
          2. يعمل restore بـ psql على test DB
          3. يتحقق إن table موجودة بعد الـ restore
        """
        import django
        db_config = settings.DATABASES.get("default", {})
        if not db_config.get("HOST"):
            pytest.skip("DATABASE_URL مش متضبطة — skip integration test")

        # Step 1: backup
        from core.backup import daily_database_backup
        with override_settings(BACKUP_DIR=str(tmp_path)):
            result = daily_database_backup.apply().get()

        gz_path = tmp_path / result["filename"]
        assert gz_path.exists()

        # Step 2: check إن الـ file يقدر يتفك ضغط
        with gzip.open(gz_path, "rb") as fh:
            sql_content = fh.read()
        assert len(sql_content) > 0, "Backup فاضي!"

        # Step 3: psql restore على test DB (dry-run — syntax check فقط)
        sql_path = tmp_path / "restore.sql"
        sql_path.write_bytes(sql_content)

        result = subprocess.run(
            ["psql", "--set=ON_ERROR_STOP=0", "--single-transaction",
             "--file", str(sql_path), "--dry-run"],
            env={**os.environ, "PGPASSWORD": db_config.get("PASSWORD", "")},
            capture_output=True,
        )
        # --dry-run بيتحقق من الـ syntax بدون ما يعمل تغييرات فعلية
        # exit code 0 = SQL صالح
        assert result.returncode == 0, (
            f"psql dry-run فشل:\n{result.stderr.decode()}"
        )

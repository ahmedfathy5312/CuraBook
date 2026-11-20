# Generated migration — add SoftDelete + timestamps to scheduling models

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0004_blocked_slot'),
    ]

    operations = [
        # ── Schedule: add SoftDelete + updated_at ─────────────────────────
        migrations.AddField(
            model_name='schedule',
            name='is_deleted',
            field=models.BooleanField(
                default=False, db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='schedule',
            name='deleted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='schedule',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── GeneratedSlot: add SoftDelete + timestamps ────────────────────
        migrations.AddField(
            model_name='generatedslot',
            name='is_deleted',
            field=models.BooleanField(
                default=False, db_index=True,
                help_text='Soft-delete flag.',
            ),
        ),
        migrations.AddField(
            model_name='generatedslot',
            name='deleted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='generatedslot',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='generatedslot',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── TimeOff: add timestamps ────────────────────────────────────────
        migrations.AddField(
            model_name='timeoff',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='timeoff',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── BlockedSlot: rename created_at is already there, add updated_at ─
        migrations.AddField(
            model_name='blockedslot',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

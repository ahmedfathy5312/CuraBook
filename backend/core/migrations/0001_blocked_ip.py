"""
Migration: Create BlockedIP table for permanent IP banning.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='BlockedIP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('ip_address', models.GenericIPAddressField(
                    unique=True,
                    db_index=True,
                    help_text='IPv4 or IPv6 address to block.',
                )),
                ('reason', models.CharField(
                    blank=True,
                    max_length=255,
                    help_text="Human-readable reason for block.",
                )),
                ('blocked_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(
                    null=True,
                    blank=True,
                    db_index=True,
                    help_text='If set, block expires at this time. Null = permanent.',
                )),
                ('blocked_by', models.CharField(
                    default='system',
                    max_length=50,
                    help_text="'system' for auto-blocks, admin username for manual blocks.",
                )),
            ],
            options={
                'verbose_name': 'Blocked IP',
                'verbose_name_plural': 'Blocked IPs',
                'ordering': ['-blocked_at'],
                'indexes': [
                    models.Index(fields=['ip_address'], name='core_blockedip_ip_idx'),
                    models.Index(fields=['expires_at'], name='core_blockedip_exp_idx'),
                ],
            },
        ),
    ]

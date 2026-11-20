"""
CuraBook — accounts 0001_initial
=================================
Creates the User model in a new 'accounts' app.
Uses db_table='users_user' to map to existing database table (zero-downtime migration).
"""

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from django.core.validators import RegexValidator
import apps.accounts.managers


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0001_initial'),
        ('contenttypes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False)),
                ("username", models.CharField(max_length=150, unique=True)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("full_name", models.CharField(blank=True, max_length=255)),
                ("phone", models.CharField(
                    blank=True, max_length=20, null=True, unique=True,
                    validators=[RegexValidator(regex=r"^\+?\d{7,15}$")]
                )),
                ("city", models.CharField(blank=True, max_length=100, null=True)),
                ("role", models.CharField(
                    blank=True, max_length=20, db_index=True,
                    choices=[
                        ("doctor", "Doctor"), ("patient", "Patient"),
                        ("assistant", "Assistant"), ("hospital_admin", "Hospital Admin"),
                        ("admin", "System Admin"),
                    ],
                )),
                ("is_patient", models.BooleanField(default=False)),
                ("is_doctor", models.BooleanField(default=False)),
                ("is_assistant", models.BooleanField(default=False)),
                ("hospital_admin", models.BooleanField(default=False)),
                ("is_platform_admin", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=False)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_deleted", models.BooleanField(default=False)),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now)),
                ("groups", models.ManyToManyField(blank=True, related_name="accounts_user_set", to="auth.group")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="accounts_user_perm_set", to="auth.permission")),
            ],
            options={
                "verbose_name": "User",
                "verbose_name_plural": "Users",
                "db_table": "accounts_user",
            },
            managers=[("objects", apps.accounts.managers.UserManager())],
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["username"], name="accounts_user_username_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["email"], name="accounts_user_email_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["role"], name="accounts_user_role_idx"),
        ),
    ]

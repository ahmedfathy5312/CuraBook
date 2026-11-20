"""
Backward compatibility imports.
New code must use: from apps.accounts.models import User
Old code can still use: from users.models import User (via this shim)
"""
from django.contrib.auth import get_user_model
User = get_user_model()

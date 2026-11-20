default_app_cnfig = 'users.apps.UsersConfig'

# TODO: Remove this entire users/ app after full migration to apps/accounts/
# Kept only for migration compatibility (see users/compat.py)
# All URL routing uses apps.accounts.urls — this module is not active
# Schedule removal: after verifying 0 usages of users/* in production
import warnings
warnings.warn(
    "The 'users' app is deprecated. Use 'apps.accounts' instead. "
    "This module will be removed in a future release.",
    DeprecationWarning,
    stacklevel=2,
)

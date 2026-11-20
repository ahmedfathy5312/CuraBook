# Backward-compat shim — all permissions now live in core.permissions
# This file re-exports them so existing imports don't break.
# TODO: Update all imports to use: from core.permissions import ...
from core.permissions import *  # noqa: F401, F403

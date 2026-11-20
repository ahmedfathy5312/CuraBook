# users/ — Legacy Compatibility Shim (BUG-10)

⚠️ **DO NOT USE.** This app is NOT in INSTALLED_APPS and will be deleted in the next sprint.

## Migration Map

| Old import | New canonical import |
|---|---|
| `from users.models import User` | `from apps.accounts.models import User` |
| `from users.models import DoctorProfile` | `from apps.doctors.models import DoctorProfile` |
| `from users.models import PatientProfile` | `from apps.patients.models import PatientProfile` |
| `from users.models import AssistantProfile` | `from apps.assistants.models import AssistantProfile` |
| `from users.admin import UserAdmin` | `from apps.accounts.admin import UserAdmin` |

## Status

All external imports have been migrated. This directory is safe to delete once confirmed by the team.

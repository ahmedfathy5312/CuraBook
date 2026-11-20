# services/api/ — Backward Compatibility Barrel Layer

**AUDIT FIX ISSUE #1 (FINAL):**

All API implementations have been moved to their canonical feature-level locations:

| Old location (barrel only) | Canonical implementation |
|---|---|
| `services/api/authApi.js` | `features/auth/api/authApi.js` |
| `services/api/usersApi.js` | `features/patient/api/patientApi.js` |
| `services/api/searchApi.js` | `features/search/api/searchApi.js` |
| `services/api/appointmentApi.js` | `features/appointments/api/appointmentsApi.js` (via re-export) |
| `services/api/doctorApi.js` | `features/doctor/api/doctorApi.js` (via re-export) |
| `services/api/reviewApi.js` | used directly by `features/doctors/` |
| `services/api/scheduleApi.js` | used directly by `features/scheduling/` |

## Why these barrel files still exist

Existing imports across the codebase use `services/api/` paths. Rather than
doing a risky mass find-and-replace across 50+ files, these barrels provide a
safe migration path — they simply re-export from the feature-level canonical
files. Any `import { login } from 'services/api/authApi'` continues to work
and resolves to the canonical `features/auth/api/authApi.js`.

## New code should import from feature-level APIs:
```js
// ✅ Correct for new code
import { login } from 'features/auth/api/authApi';
import { searchDoctors } from 'features/search/api/searchApi';
import { getMyProfile } from 'features/patient/api/patientApi';

// ⚠️ Still works but deprecated
import { login } from 'services/api/authApi';
```

# context/ — Migration Status

**AUDIT FIX #10:** This folder is being migrated to feature-based architecture.

## Current Status

| File | Status | Target |
|---|---|---|
| `AuthContext.jsx` | ⚠️ To migrate | `features/auth/context/AuthContext.jsx` |
| `LoadingContext.jsx` | ⚠️ To migrate | `hooks/useLoading.js` or `features/ui/` |
| `PopupProvider.jsx` | ⚠️ To migrate | `components/ui/PopupProvider.jsx` |
| `ToastContext.jsx` | ✅ Keep here | Global utility — acceptable at root |

## Why Not Moved Yet

AuthContext is imported by 15+ files across all features. Moving it requires
updating every import path. The `features/auth/useAuth.js` already re-exports
from this location as a migration bridge:

```js
// features/auth/useAuth.js
export { useAuth, default as AuthProvider } from '../../context/AuthContext';
```

## Migration Plan

1. Create `features/auth/context/AuthContext.jsx` (copy + adjust path)
2. Update `features/auth/useAuth.js` to point to the new location
3. Run a global find-replace: `from '../../../context/AuthContext'` → `from '../../../features/auth/context/AuthContext'`
4. Delete `context/AuthContext.jsx`
5. Move `LoadingContext.jsx` → `hooks/useLoading.js`
6. Move `PopupProvider.jsx` → `components/ui/PopupProvider.jsx`

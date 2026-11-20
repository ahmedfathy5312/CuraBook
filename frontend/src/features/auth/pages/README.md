# features/auth/pages/ — Intentionally Empty

**AUDIT FIX #3 / ISSUE #3 Documentation**

Auth-related pages (Login, Register, ForgotPassword, ResetPassword) live at:

```
features/public/pages/
  Login.jsx
  UserSignup.jsx
  DoctorSignup.jsx
  HospitalSignup.jsx
  AssistantSignup.jsx
  ForgotPassword.jsx
  ResetPassword.jsx
  EmailVerification.jsx
  JoinCura.jsx
```

## Why public/pages instead of auth/pages?

These pages are **unauthenticated** — they use `PublicLayout` and are accessible
without a token. Placing them in `features/public/` reflects their routing context
accurately. Moving them here would require updating:
- 8 router.jsx routes
- All imports within each page
- PublicLayout references

## Migration Plan (future sprint)

If strict feature separation is required:
1. Move each page file to `features/auth/pages/`
2. Update `features/public/pages/` to re-export them (backward compat)
3. Update router.jsx to use new paths
4. Delete the re-export shims after confirming no direct imports remain

## Auth Context & Hook

- Context: `src/context/AuthContext.jsx` (see context/README.md for migration plan)  
- Hook:    `features/auth/useAuth.js` (re-exports from context/ as a bridge)
- API:     `features/auth/authApi.js` (re-exports from services/api/authApi.js)

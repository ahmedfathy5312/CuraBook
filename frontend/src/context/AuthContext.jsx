/**
 * context/AuthContext.jsx
 *
 * AUDIT FIX (Issue #3 / Issue #10):
 * AuthContext has been moved to its canonical location:
 *   src/features/auth/context/AuthContext.jsx
 *
 * This file is kept as a re-export shim so all existing imports continue to
 * work without changes. New code should import from the canonical path:
 *   import { useAuth, AuthContext, isPublicPath } from '../features/auth/context/AuthContext';
 */
export {
  AuthContext,
  useAuth,
  isPublicPath,
  default,
} from '../features/auth/context/AuthContext';

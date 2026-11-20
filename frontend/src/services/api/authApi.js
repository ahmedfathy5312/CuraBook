/**
 * services/api/authApi.js
 * AUDIT FIX ISSUE #1 (FINAL): Re-export barrel only.
 * Canonical implementation moved to: features/auth/api/authApi.js
 * This file exists solely for backward compatibility with existing imports.
 */
export * from '../../features/auth/api/authApi';
export { default } from '../../features/auth/api/authApi';

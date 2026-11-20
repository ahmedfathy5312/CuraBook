/**
 * services/api/usersApi.js
 * AUDIT FIX ISSUE #1 (FINAL): Re-export barrel only.
 * Canonical implementation moved to: features/patient/api/patientApi.js
 * This file exists solely for backward compatibility with existing imports.
 */
export * from '../../features/patient/api/patientApi';
export { default } from '../../features/patient/api/patientApi';

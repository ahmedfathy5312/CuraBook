/**
 * services/api/searchApi.js
 * AUDIT FIX ISSUE #1 (FINAL): Re-export barrel only.
 * Canonical implementation moved to: features/search/api/searchApi.js
 * This file exists solely for backward compatibility with existing imports.
 */
export * from '../../features/search/api/searchApi';
export { default } from '../../features/search/api/searchApi';

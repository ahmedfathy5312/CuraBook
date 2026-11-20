/**
 * context/LoadingContext.jsx — BACKWARD COMPAT SHIM
 *
 * H-05 FIX: Canonical location moved to src/app/providers/LoadingProvider.jsx
 * This file is kept as a re-export shim so existing imports continue to work
 * without requiring a mass refactor across 26 files.
 *
 * New code should import from: 'src/app/providers/LoadingProvider'
 */
export { LoadingProvider, useLoading, default } from '../app/providers/LoadingProvider';

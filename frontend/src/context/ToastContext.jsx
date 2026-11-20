/**
 * context/ToastContext.jsx — BACKWARD COMPAT SHIM
 *
 * H-05 FIX: Canonical location moved to src/app/providers/ToastProvider.jsx
 * This file is kept as a re-export shim so existing imports continue to work
 * without requiring a mass refactor across 26 files.
 *
 * New code should import from: 'src/app/providers/ToastProvider'
 */
export { ToastProvider, useToast, default } from '../app/providers/ToastProvider';

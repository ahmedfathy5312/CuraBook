/**
 * app/providers/index.js — Providers barrel export
 *
 * H-05 FIX: Canonical provider location.
 * All providers are now co-located in src/app/providers/ per feature-isolation spec.
 */
export { LoadingProvider, useLoading } from './LoadingProvider';
export { ToastProvider, useToast }     from './ToastProvider';

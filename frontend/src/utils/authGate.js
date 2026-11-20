/**
 * authGate.js — Auth Initialization Gate
 *
 * Prevents API calls from firing before the silent token refresh completes
 * on page reload (the main cause of "Given token not valid" errors on dashboard).
 *
 * Usage:
 *  - apiClient request interceptor calls: await waitForAuth()
 *  - AuthContext calls: resolveAuthGate() when authInitialized = true
 */

let _resolve = null;
let _promise = null;
let _resolved = false;

function _createGate() {
  _promise = new Promise((res) => { _resolve = res; });
}

_createGate();

/** Await this before making API calls when access token may be null */
export function waitForAuth() {
  if (_resolved) return Promise.resolve();
  return _promise;
}

/** Call this when AuthContext finishes its mount-time session restore */
export function resolveAuthGate() {
  if (!_resolved) {
    _resolved = true;
    if (_resolve) _resolve();
  }
}

/** Reset gate (e.g., after logout) */
export function resetAuthGate() {
  _resolved = false;
  _createGate();
}

/**
 * CuraBook — JWT Token Utilities
 *
 * F-01 FIX (XSS Vulnerability): Tokens are NO LONGER stored in localStorage.
 *
 * Security model:
 *  - Access token  → stored in module-level memory (in-memory, never persisted)
 *  - Refresh token → stored as HttpOnly SameSite=Strict cookie (set by backend /auth/login/)
 *  - User/role     → stored in localStorage (non-sensitive metadata only)
 *
 * Why this is safe:
 *  - An XSS payload can call localStorage.getItem() but CANNOT read HttpOnly cookies.
 *  - The in-memory access token is lost on page reload, but /auth/token/refresh/ silently
 *    restores it using the HttpOnly cookie (no body param needed — cookie is sent automatically).
 *  - Worst case for XSS: the attacker can impersonate the user for the current tab lifetime
 *    (max 60 min access token TTL) but CANNOT steal the 7-day refresh token.
 *
 * Backend requirement (F-01 server-side):
 *  - POST /auth/login/ must set:
 *      Set-Cookie: __cb_refresh=<token>; HttpOnly; SameSite=Strict; Secure; Path=/api/v1/auth/token/refresh/
 *  - POST /auth/token/refresh/ must read the cookie automatically (no body param).
 *  - POST /auth/logout/ must clear the cookie.
 */

// ── In-memory access token (never touches localStorage) ──────────────────────
let _accessToken = null;

export function parseJWT(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[JWT] Parse failed:', e);
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJWT(token);
  if (!payload?.exp) return true;
  // Buffer: return true (expired) 10 seconds BEFORE actual expiry to avoid race conditions
  return payload.exp * 1000 < Date.now() + 10000;
}

export function getTokenExpiry(token) {
  const payload = parseJWT(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
}

// ── Secure token storage ──────────────────────────────────────────────────────
// Only non-sensitive metadata (user object, role string) goes in localStorage.
// Tokens are NEVER written to localStorage.
const META_KEYS = {
  user: '__cb_user',
  role: '__cb_role',
};

export const tokenStorage = {
  // Access token — in-memory only
  getAccess:  () => _accessToken,
  setAccess:  (v) => { _accessToken = v || null; },

  // Refresh token — HttpOnly cookie (managed by backend, invisible to JS)
  // getRefresh / setRefresh are NO-OPs on the frontend — the cookie is
  // sent automatically by the browser on requests to /auth/token/refresh/.
  getRefresh: () => null,   // F-01 FIX: refresh token is HttpOnly cookie — not accessible from JS
  setRefresh: () => {},     // F-01 FIX: backend sets the cookie via Set-Cookie header

  // Non-sensitive user metadata (safe in localStorage)
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(META_KEYS.user)); } catch { return null; }
  },
  getRole: () => localStorage.getItem(META_KEYS.role),

  setUser: (v) => localStorage.setItem(META_KEYS.user, JSON.stringify(v)),
  setRole: (v) => localStorage.setItem(META_KEYS.role, v),

  setAll: ({ access, refresh, user, role }) => {
    // access → memory only
    if (access)  _accessToken = access;
    // refresh → HttpOnly cookie (set by backend, we do nothing here)
    // user/role → localStorage (non-sensitive metadata)
    if (user)    localStorage.setItem(META_KEYS.user, JSON.stringify(user));
    if (role)    localStorage.setItem(META_KEYS.role, role);
  },

  clear: () => {
    _accessToken = null;
    Object.values(META_KEYS).forEach(k => localStorage.removeItem(k));
    // Note: the HttpOnly refresh cookie is cleared by the backend on /auth/logout/
    // We cannot clear it from JS — that's the whole point.
  },
};

// Legacy compat shims
export function getStoredTokens() {
  return {
    access:  tokenStorage.getAccess(),
    refresh: tokenStorage.getRefresh(),
  };
}

export function clearTokens() {
  tokenStorage.clear();
}

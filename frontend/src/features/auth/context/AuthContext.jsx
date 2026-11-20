/**
 * AuthContext.jsx  —  CuraBook Auth State Manager
 *
 * Security model (F-01):
 *   • Access token  → in-memory only (_accessToken variable), lost on reload
 *   • Refresh token → HttpOnly cookie (set/cleared by backend, NEVER accessible from JS)
 *   • User/role     → localStorage (non-sensitive metadata only)
 *
 * HOME-FIX (root-cause analysis):
 *   Old bug: on page reload _accessToken = null AND getRefresh() = null (always).
 *   isAuthenticated fell back to !!user (localStorage) → SmartHome redirected to
 *   /dashboard → API call → 401 → apiClient tried cookie refresh → if cookie expired
 *   → handleLogout() → window.location = /login.  User saw login every reload.
 *
 *   Fix strategy:
 *   1. On mount, if storedUser exists but no in-memory access token, silently call
 *      /auth/token/refresh/ (the browser sends the HttpOnly cookie automatically).
 *      • Cookie valid   → restore access token in memory, stay authenticated.
 *      • Cookie expired → clear stale localStorage, stay on current page (no redirect).
 *   2. Expose `authInitialized` boolean (false while the check is in flight).
 *   3. SmartHome and RoleGuard wait for authInitialized before any redirect.
 *   4. handleExpiredSession only redirects to /login from PROTECTED pages.
 */

import axios from 'axios';
import { API } from '../../../constants/apiRoutes';
import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, useRef,
} from 'react';
import apiClient from '../../../services/apiClient';
import { isTokenExpired, tokenStorage } from '../../../utils/tokenUtils';
import { resolveAuthGate, resetAuthGate } from '../../../utils/authGate';
import socketManager from '../../../services/socketManager';
import ENV from '../../../config/env';

export const AuthContext = createContext(null);

const ROLE_ROUTES = {
  doctor:         '/doctor-dashboard',
  hospital:       '/hospital-dashboard',
  hospital_admin: '/hospital-dashboard',
  admin:          '/admin-dashboard',
  assistant:      '/assistant-dashboard',
  patient:        '/dashboard',
};

const BACKEND_ROLE_MAP = {
  hospital_admin: 'hospital',
};

// Pages that must NEVER trigger a forced redirect to /login
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/join',
  '/signup',
  '/doctor-signup',
  '/hospital-signup',
  '/assistant-signup',
  '/about-us',
  '/contact-us',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unauthorized',
];

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

function detectRole(user) {
  if (!user) return 'guest';
  const raw = user.current_role || user.role || user.user_type || null;
  if (raw && typeof raw === 'string') {
    const normalised = raw.toLowerCase().trim();
    return BACKEND_ROLE_MAP[normalised] || normalised;
  }
  if (user.is_superuser || user.is_platform_admin)  return 'admin';
  if (user.is_doctor)                                return 'doctor';
  if (user.hospital_admin || user.is_hospital_admin) return 'hospital';
  if (user.is_assistant)                             return 'assistant';
  return 'patient';
}

const TOKEN_CHECK_INTERVAL = 30_000;

export default function AuthProvider({ children }) {
  const storedUserInit = tokenStorage.getUser();
  const accessInit     = tokenStorage.getAccess();

  const [user,             setUser]            = useState(storedUserInit);
  const [role,             setRoleState]       = useState(() => tokenStorage.getRole() || 'guest');
  const [authLoading,      setAuthLoading]     = useState(false);
  // authInitialized: false while we're doing the silent session-restore on mount.
  // SmartHome and RoleGuard must wait for this before making redirect decisions.
  const [authInitialized,  setAuthInitialized] = useState(() => {
    // Only resolve the auth gate immediately if:
    // 1. There's no stored user (guest session, no need to wait)
    // 2. We have a stored user AND a valid (non-expired) access token in memory
    // If token is expired we MUST wait for the silent refresh to complete first,
    // otherwise API calls will fire with an expired token → 401 / "token not valid"
    const hasUser = !!storedUserInit;
    const hasValidToken = !!accessInit && !isTokenExpired(accessInit);
    const isReady = !hasUser || hasValidToken;
    if (isReady) resolveAuthGate(); // unblock any queued API requests immediately
    return isReady;
  });
  const expiryTimerRef = useRef(null);

  const setRole = useCallback((newRole) => {
    setRoleState(newRole);
    tokenStorage.setRole(newRole);
  }, []);

  // ── On mount: silent session restore ────────────────────────────────────
  // If we have a stored user but no valid in-memory access token, try to renew
  // via the HttpOnly refresh cookie. This is the ONLY reliable way to know
  // whether the user's session is still alive after a page reload.
  useEffect(() => {
    if (authInitialized) return; // Already ready — nothing to do

    const storedUser = tokenStorage.getUser();
    if (!storedUser) {
      setAuthInitialized(true);
      return;
    }

    axios
      .post(
        `${ENV.API_BASE_URL}${API.AUTH.REFRESH}`,
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        // Cookie was valid — restore the in-memory access token
        const newAccess = data.access || data?.data?.access;
        if (newAccess) {
          tokenStorage.setAccess(newAccess);
          socketManager.connect(newAccess);
        }
        // Keep existing stored user & role (still valid)
      })
      .catch(() => {
        // Cookie expired or missing → clear stale data SILENTLY (no redirect).
        // The user will simply see the Home page instead of being forced to login.
        tokenStorage.clear();
        setUser(null);
        setRoleState('guest');
      })
      .finally(() => {
        setAuthInitialized(true);
        resolveAuthGate(); // unblock API requests that were waiting for session restore
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Periodic expiry check (interval, not on mount) ───────────────────────
  // getRefresh() always returns null (HttpOnly cookie, not accessible from JS).
  // This interval is kept for future compatibility; it only fires if a refresh
  // token is somehow stored in memory (e.g. in non-HttpOnly fallback mode).
  const handleExpiredSession = useCallback(() => {
    socketManager.disconnect();
    tokenStorage.clear();
    setUser(null);
    setRoleState('guest');
    const pathname = window.location.pathname;
    // Only force-redirect to login from PROTECTED pages — not from Home
    if (!pathname.startsWith('/login') && !isPublicPath(pathname)) {
      const returnTo = pathname + window.location.search;
      window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
    }
  }, []);

  useEffect(() => {
    const check = () => {
      const refresh = tokenStorage.getRefresh();
      if (refresh && isTokenExpired(refresh)) handleExpiredSession();
    };
    expiryTimerRef.current = setInterval(check, TOKEN_CHECK_INTERVAL);
    return () => clearInterval(expiryTimerRef.current);
  }, [handleExpiredSession]);

  // ── Login ────────────────────────────────────────────────────────────────
  const setSession = useCallback((raw) => {
    const userData     = raw.user || raw;
    const detectedRole = detectRole(userData);
    tokenStorage.setAll({
      access:  raw.access,
      refresh: raw.refresh || null,
      user:    userData,
      role:    detectedRole,
    });
    setUser(userData);
    setRole(detectedRole);
    setAuthInitialized(true);
    resolveAuthGate(); // login always resolves the gate
    if (raw.access) socketManager.connect(raw.access);
    return { user: userData, role: detectedRole, redirect: ROLE_ROUTES[detectedRole] || '/' };
  }, [setRole]);

  const login = useCallback(async (credentials) => {
    setAuthLoading(true);
    try {
      const { data: raw } = await apiClient.post(API.AUTH.LOGIN, credentials);
      return setSession(raw);
    } finally {
      setAuthLoading(false);
    }
  }, [setSession]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    apiClient.post(API.AUTH.LOGOUT, {}).catch(() => {});
    socketManager.disconnect();
    tokenStorage.clear();
    resetAuthGate(); // reset so next login creates a fresh gate
    setUser(null);
    setRoleState('guest');
  }, []);

  // ── Refresh user from server ──────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get(API.USERS.ME);
      setUser(data);
      tokenStorage.setUser(data);
      const newRole = detectRole(data);
      setRole(newRole);
      return data;
    } catch { return null; }
  }, [setRole]);

  // isAuthenticated: true if we have a valid in-memory access token, OR if
  // we have stored user metadata (meaning a restore attempt may be in progress).
  // The mount effect is the source of truth — it settles authInitialized.
  const isAuthenticated = useMemo(() => {
    const access = tokenStorage.getAccess();
    if (access && !isTokenExpired(access)) return true;
    return !!user; // during / after mount restore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, authInitialized]);

  // BUG-8 FIX: also persist the merged user to tokenStorage so that a component
  // re-render or page-reload does not revert the displayed name back to the old value.
  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const updated = { ...(prev || {}), ...partial };
      tokenStorage.setUser(updated);   // ← keep localStorage in sync
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, role, setRole, login, logout, refreshUser, updateUser, setSession,
      isAuthenticated, authLoading, authInitialized, ROLE_ROUTES, detectRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

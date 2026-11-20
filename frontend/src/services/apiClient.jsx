/**
 * services/apiClient.js — Production-grade Axios Client for CuraBook
 *
 * Features:
 *  ✓ Automatic /api/v1 prefix via ENV.API_BASE_URL
 *  ✓ JWT attach on every request
 *  ✓ Auth gate: waits for silent refresh before firing calls on page reload
 *  ✓ 401 → auto token refresh with queue (no duplicate refreshes)
 *  ✓ Refresh failure → auto logout + redirect
 *  ✓ Socket token sync on refresh
 *  ✓ Structured error objects for getErrorMessage()
 *
 * CRITICAL FIX (Problems 1, 5, 10):
 *  Access token lives in memory → lost on page reload.
 *  AuthContext.mount does a silent cookie refresh ASYNC, but React Query
 *  fires API calls immediately on mount → 401 because token is still null.
 *  Fix: Request interceptor awaits authGate before sending when no token.
 */
import axios from 'axios';
import socketManager from './socketManager';
import { tokenStorage } from '../utils/tokenUtils';
import { waitForAuth } from '../utils/authGate';
import ENV from '../config/env';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,           // http://localhost:8000/api/v1
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,               // send HttpOnly refresh cookie on every request
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    // Do not attach tokens to public registration/login endpoints
    const url = config.url || '';
    const isPublicEndpoint =
      url.includes('/auth/register/') ||
      url.includes('/auth/login/') ||
      url.includes('/auth/password-reset/') ||
      url.includes('/auth/verify-email/') ||
      url.includes('/auth/resend-verification/') ||
      url.includes('/auth/token/refresh/');

    if (isPublicEndpoint) {
      delete config.headers.Authorization;
      return config;
    }

    // ── AUTH GATE: wait for session restore before sending ────────────────────
    // If user metadata is in localStorage but access token is not yet in memory
    // (happens on every page reload), wait for AuthContext to finish the silent
    // cookie-based refresh before we send the request. Without this wait, the
    // request fires with no Bearer header → 401 → "Given token not valid".
    const hasStoredUser = !!localStorage.getItem('__cb_user');
    let token = tokenStorage.getAccess();

    if (!token && hasStoredUser && !config._skipAuthGate) {
      try {
        // Wait up to 8s for auth to initialize, then proceed anyway
        await Promise.race([
          waitForAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('gate timeout')), 8000)),
        ]);
      } catch {
        // Timeout or gate error — proceed without token (will trigger 401 → refresh)
      }
      token = tokenStorage.getAccess();
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: 401 + refresh queue ───────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// Public paths — 401 on these never triggers redirect to /login
const _PUBLIC_PATHS = [
  '/', '/login', '/join', '/signup', '/doctor-signup',
  '/hospital-signup', '/assistant-signup', '/about-us',
  '/contact-us', '/forgot-password', '/reset-password',
  '/verify-email', '/unauthorized',
];
function _isPublicPath(p) {
  return _PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(pub + '/'));
}

const handleLogout = () => {
  socketManager.disconnect();
  tokenStorage.clear();
  const path = window.location.pathname;
  if (!_isPublicPath(path)) {
    window.location.href = `/login?next=${encodeURIComponent(path)}`;
  }
};

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap CuraBookRenderer envelope: { success: true, data: <payload> }
    const d = response.data;
    if (d && d.success === true && typeof d.data !== 'undefined') {
      // FIX ISSUE-014: Preserve pagination metadata so AuditSection (and any paginated section)
      // can read total count. Attach as _pagination on the data array/object.
      const payload = d.data;
      if (d.pagination && payload && typeof payload === 'object') {
        payload._pagination = d.pagination;
        payload._count = d.pagination.count;
      }
      response.data = payload;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status  = error.response?.status;
    const data    = error.response?.data;

    // Parse wrapped error envelope
    if (data?.error && typeof data.error === 'object') {
      error.errorDetail = data.error.message || null;
      error.errorCode   = data.error.code    || null;
      error.errorFields = data.error.details || null;
    } else if (typeof data === 'string' && data.trim().startsWith('<')) {
      // HTML response (e.g. Django 500 Debug page)
      error.errorDetail = `Internal Server Error (${status}). Database migrations might be missing.`;
      error.isHtmlResponse = true;
    } else {
      // ── BUG #2 FIX: Properly extract DRF field-level errors ───────────────
      // DRF returns validation errors as:
      //   { "field_name": ["error message"], ... }     ← field errors
      //   { "non_field_errors": ["error message"] }   ← non-field errors
      // The old code only read data.detail/data.message, missing all field errors.
      // Now we collect ALL error messages into a single readable string.
      if (data && typeof data === 'object' && !Array.isArray(data) && !data.detail) {
        // Flatten all DRF field errors into a readable string
        const fieldErrors = Object.entries(data)
          .map(([field, messages]) => {
            const msgs = Array.isArray(messages) ? messages : [messages];
            const validMsgs = msgs
              .map(m => (typeof m === 'string' ? m : JSON.stringify(m)))
              .filter(Boolean);
            if (!validMsgs.length) return null;
            // Skip generic "This field is required." on 'doctor' — that's our
            // UniqueTogetherValidator leak; the real message comes from validate()
            if (field === 'doctor' && validMsgs.some(m => m.includes('required'))) return null;
            return field === 'non_field_errors'
              ? validMsgs.join(' ')
              : `${validMsgs.join(' ')}`;
          })
          .filter(Boolean)
          .join(' | ');

        error.errorDetail  = fieldErrors || data?.detail || data?.message || null;
        error.errorFields  = data;   // preserve raw response for consumers that need per-field access
      } else {
        error.errorDetail = data?.detail || data?.message || null;
      }
    }

    error.statusCode = status;

    // ── 401 handling: attempt token refresh ──────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data: refreshData } = await axios.post(
          `${ENV.API_BASE_URL}/auth/token/refresh/`,
          {},
          { withCredentials: true }
        );
        const newAccess = refreshData.access || refreshData?.data?.access;
        if (!newAccess) throw new Error('No access token in refresh response');
        tokenStorage.setAccess(newAccess);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        socketManager.updateToken(newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        if (!originalRequest.method) {
          throw new Error('Cannot retry: HTTP method missing from originalRequest');
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        handleLogout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403) error.isPermissionError = true;

    if (status === 405) {
      error.isMethodNotAllowed = true;
      error.errorDetail = error.errorDetail || 'This action is not allowed.';
      console.error(
        `[API] 405 Method Not Allowed: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`
      );
    }

    if (status === 429) {
      error.isRateLimited = true;
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        error.retryAfterSeconds = parseInt(retryAfter, 10);
        error.errorDetail = `Too many requests. Please wait ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`;
      } else {
        error.errorDetail = error.errorDetail || 'Too many requests. Please wait a moment.';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

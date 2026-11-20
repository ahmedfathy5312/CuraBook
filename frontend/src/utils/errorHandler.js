/**
 * utils/errorHandler.js — Centralized API Error Handler
 *
 * Normalizes errors from apiClient into human-readable messages.
 * Works with the axios interceptor in apiClient.js.
 */

/**
 * Extract a user-friendly message from an API error.
 * @param {Error|Object} error — The caught error (from axios or fetch)
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';

  // ✅ FIX: Check enriched error fields set by apiClient interceptor first
  // These are already extracted from the CuraBook error envelope
  if (error.errorDetail) return error.errorDetail;

  // Axios error with response body
  const data = error.response?.data;

  if (data) {
    // Django REST Framework common error shapes:
    if (typeof data.detail === 'string')        return data.detail;
    if (typeof data.message === 'string')       return data.message;
    if (typeof data.error === 'string')         return data.error;
    if (typeof data.non_field_errors === 'object')
      return data.non_field_errors[0] || 'Validation error';

    // Field-level errors — return first field message
    const firstField = Object.keys(data)[0];
    if (firstField) {
      const fieldError = data[firstField];
      if (Array.isArray(fieldError)) return `${firstField}: ${fieldError[0]}`;
      if (typeof fieldError === 'string') return `${firstField}: ${fieldError}`;
    }
  }

  // HTTP status fallbacks
  const status = error.response?.status || error.statusCode;
  switch (status) {
    case 400: return 'Invalid request. Please check your input.';
    case 401: return 'Session expired. Please log in again.';
    case 403: return 'You do not have permission to do this.';
    case 404: return 'The requested resource was not found.';
    case 409: return 'Conflict: this action cannot be completed.';
    case 422: return 'Validation error. Please check your data.';
    case 429: return 'Too many requests. Please wait a moment.';
    case 500: return 'Server error. Please try again later.';
    case 503: return 'Service unavailable. Please try again later.';
    default:  break;
  }

  // Network error
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))
    return 'Request timed out. Check your connection.';
  if (!navigator.onLine)
    return 'No internet connection. Please check your network.';

  return error.message || 'An unexpected error occurred.';
}

/**
 * Extract field-level errors for form display.
 * Returns { fieldName: 'error message', ... }
 * @param {Error} error
 * @returns {Object}
 */
export function getFieldErrors(error) {
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return {};

  const fieldErrors = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'detail' || key === 'message' || key === 'error') return;
    if (Array.isArray(value)) {
      fieldErrors[key] = value[0];
    } else if (typeof value === 'string') {
      fieldErrors[key] = value;
    }
  });
  return fieldErrors;
}

/**
 * Returns true if the error is a 4xx client error (not network/server).
 */
export function isClientError(error) {
  const status = error.response?.status;
  return status >= 400 && status < 500;
}

/**
 * Returns true if the error is a network error (no response).
 */
export function isNetworkError(error) {
  return !error.response && !!error.request;
}

/**
 * Returns true if the request was rate-limited (429).
 */
export function isRateLimited(error) {
  return error?.isRateLimited === true || error?.response?.status === 429;
}

/**
 * Returns true if the HTTP method is not allowed on this endpoint (405).
 */
export function isMethodNotAllowed(error) {
  return error?.isMethodNotAllowed === true || error?.response?.status === 405;
}

export default { getErrorMessage, getFieldErrors, isClientError, isNetworkError, isRateLimited, isMethodNotAllowed };


// ── v31 UX-04: Backend error code → i18n translation key mapping ─────────────
// Maps backend error codes (from CuraBook error envelope) to i18n keys.
// Usage: t(ERROR_CODE_MAP[code] || 'errors.generic')
export const ERROR_CODE_MAP = {
  SLOT_UNAVAILABLE:       'errors.slot_unavailable',
  SLOT_ALREADY_BOOKED:    'errors.slot_unavailable',
  APPOINTMENT_NOT_FOUND:  'errors.appointment_not_found',
  PERMISSION_DENIED:      'errors.permission_denied',
  INVALID_STATUS:         'errors.invalid_status',
  RATE_LIMITED:           'errors.rate_limited',
  TOKEN_EXPIRED:          'errors.session_expired',
  VALIDATION_ERROR:       'errors.validation',
  SERVER_ERROR:           'errors.server',
};

/**
 * Given a backend error, returns the i18n translation key.
 * Falls back to 'errors.generic' if no mapping found.
 * Usage: const msg = t(getErrorI18nKey(error))
 */
export function getErrorI18nKey(error) {
  const code = error?.response?.data?.code || error?.code;
  return ERROR_CODE_MAP[code] || 'errors.generic';
}

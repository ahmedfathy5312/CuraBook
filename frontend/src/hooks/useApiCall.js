/**
 * hooks/useApiCall.js — Generic async API call hook with error handling
 *
 * Wraps any async function with:
 *  - loading state
 *  - error normalization via getErrorMessage()
 *  - optional toast notification
 *
 * Usage:
 *   const { execute, loading, error } = useApiCall(bookAppointment, {
 *     onSuccess: (data) => toast.success('Appointment booked!'),
 *     successMessage: 'Appointment booked!',
 *   });
 *   await execute({ doctor: 1, date: '2026-01-01', slot_id: 5 });
 */
import { useState, useCallback, useRef } from 'react';
import { getErrorMessage } from '../utils/errorHandler';

/**
 * @param {Function} apiFunction — The async API function to wrap
 * @param {Object}   options
 * @param {Function} [options.onSuccess]      — Called with response data on success
 * @param {Function} [options.onError]        — Called with error on failure
 * @param {string}   [options.successMessage] — Auto-toast message on success (requires toast context)
 * @param {boolean}  [options.resetOnCall]    — Reset error before each call (default: true)
 */
export function useApiCall(apiFunction, options = {}) {
  const {
    onSuccess,
    onError,
    resetOnCall = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async (...args) => {
    if (resetOnCall) setError(null);
    setLoading(true);

    try {
      const result = await apiFunction(...args);
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      onError?.(err, message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError, resetOnCall]);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(false);
  }, []);

  return { execute, loading, error, data, reset };
}

export default useApiCall;

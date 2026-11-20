import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * useQueryParams — helper to manage URL search params as state.
 * Keeps filter/search state in URL so it's shareable and survives browser back.
 */
export function useQueryParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = { ...defaults };
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const setParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value !== '' && value !== null && value !== undefined) {
        next.set(key, String(value));
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [setSearchParams]);

  const setParams = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          next.set(key, String(value));
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  }, [setSearchParams]);

  const resetParams = useCallback(() => setSearchParams({}), [setSearchParams]);

  return { params, setParam, setParams, resetParams };
}

export default useQueryParams;

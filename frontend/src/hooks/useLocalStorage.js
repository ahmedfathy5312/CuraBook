/**
 * useLocalStorage.js — Phase 4 Polish
 * ======================================
 * useState that persists its value in localStorage.
 * Used for doctor UI preferences (view mode, language, etc.)
 *
 * Usage:
 *   const [viewMode, setViewMode] = useLocalStorage('appt_view', 'table');
 */

import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const val = value instanceof Function ? value(storedValue) : value;
      setStoredValue(val);
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (err) {
      console.error('[useLocalStorage] write error:', err);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;

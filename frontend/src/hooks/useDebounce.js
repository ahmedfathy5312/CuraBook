import { useState, useEffect } from 'react';

/**
 * useDebounce — delays a value update by `delay` ms.
 * Prevents excessive API calls on rapid input changes (e.g. search).
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

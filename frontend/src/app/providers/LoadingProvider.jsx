/**
 * app/providers/LoadingProvider.jsx — Global Loading System (Canonical Location)
 *
 * Shows a top progress bar for long-running operations.
 * Use in combination with React Query's global callbacks.
 *
 * Usage:
 *   const { showLoader, hideLoader, isLoading } = useLoading();
 *   showLoader('Booking appointment...');
 *   hideLoader();
 *
 * H-05 FIX: Moved from src/context/LoadingContext.jsx to src/app/providers/
 * per the enterprise feature-isolation spec. src/context/LoadingContext.jsx
 * is now a backward-compat re-export shim.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [state, setState] = useState({ active: false, message: '' });
  const countRef = useRef(0); // handle overlapping async calls

  const showLoader = useCallback((message = '') => {
    countRef.current++;
    setState({ active: true, message });
  }, []);

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setState({ active: false, message: '' });
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading: state.active, message: state.message, showLoader, hideLoader }}>
      {state.active && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          height: '3px', background: 'var(--border)',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #1B5E8A, #154E73)',
            animation: 'progress-bar 1.5s ease-in-out infinite',
            width: '40%',
          }} />
          <style>{`
            @keyframes progress-bar {
              0%   { width: 0%; margin-inline-start: 0%; }
              50%  { width: 60%; margin-inline-start: 20%; }
              100% { width: 0%; margin-inline-start: 100%; }
            }
          `}</style>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used inside LoadingProvider');
  return ctx;
};

export default LoadingProvider;

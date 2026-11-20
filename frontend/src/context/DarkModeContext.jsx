/**
 * DarkModeContext.jsx — Global Dark Mode Management
 * Sprint 3: CSS vars for html.dark already exist in index.css — this context activates them.
 * Persists preference to localStorage. Applies/removes 'dark' class on <html>.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DarkModeContext = createContext({ dark: false, toggleDark: () => {}, setDark: () => {} });

const STORAGE_KEY = 'cb_dark_mode';

export function DarkModeProvider({ children }) {
  const [dark, _setDark] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) return stored === 'true';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch { return false; }
  });

  // Keep <html class="dark"> in sync
  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch {}
  }, [dark]);

  const setDark    = useCallback((val) => _setDark(typeof val === 'function' ? val : Boolean(val)), []);
  const toggleDark = useCallback(() => _setDark(d => !d), []);

  return (
    <DarkModeContext.Provider value={{ dark, toggleDark, setDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export default DarkModeContext;

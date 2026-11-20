/**
 * useDarkMode.js
 * Manages dark mode via class on <html> element.
 * Persists preference to localStorage.
 * Respects system preference on first visit.
 *
 * NEW — v17: Implements dark mode support across the app.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'curabook_dark_mode';

function getInitialDark() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyDark(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(isDark));
  } catch {}
}

let listeners = [];
let _isDark = getInitialDark();
applyDark(_isDark);

export function useDarkMode() {
  const [isDark, setIsDark] = useState(_isDark);

  useEffect(() => {
    listeners.push(setIsDark);
    return () => { listeners = listeners.filter(l => l !== setIsDark); };
  }, []);

  const toggle = () => {
    _isDark = !_isDark;
    applyDark(_isDark);
    listeners.forEach(l => l(_isDark));
  };

  return { isDark, toggle };
}

export default useDarkMode;

/**
 * ScrollToTop.jsx — Phase 4 Polish
 * ==================================
 * Scrolls the window to the top whenever the route changes.
 * Without this, navigating between pages keeps the old scroll position.
 *
 * Drop it inside <BrowserRouter> in App.jsx.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [pathname]);

  return null;
}

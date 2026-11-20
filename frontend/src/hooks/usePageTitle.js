/**
 * usePageTitle.js — Phase 4 Polish
 * ==================================
 * Sets the browser tab title whenever a page mounts.
 * Appends " | CuraBook" to every page title.
 * Resets to the default on unmount.
 *
 * Usage:
 *   usePageTitle(isRTL ? 'لوحة التحكم' : 'Dashboard');
 *   usePageTitle(t('nav.analytics'));
 */

import { useEffect } from 'react';

const DEFAULT_TITLE = 'CuraBook — نظام إدارة العيادات';

export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} | CuraBook`;
    return () => { document.title = prev || DEFAULT_TITLE; };
  }, [title]);
}

export default usePageTitle;

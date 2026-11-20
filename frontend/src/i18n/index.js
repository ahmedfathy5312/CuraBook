/**
 * CuraBook — i18n Configuration
 * دعم اللغة العربية والإنجليزية مع RTL/LTR تلقائي
 *
 * Usage:
 *   import { t, setLang, getCurrentLang } from '../i18n';
 *   t('appointments.title')  → 'مواعيدي' or 'My Appointments'
 */

import ar from './locales/ar';
import en from './locales/en';

const LOCALES = { ar, en };
const LANG_KEY = 'curabook_lang';

export function getCurrentLang() {
  return localStorage.getItem(LANG_KEY) || 'ar';
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
}

export function t(key, varsOrFallback = {}) {
  const lang    = getCurrentLang();
  const strings = LOCALES[lang] || LOCALES['ar'];
  const parts   = key.split('.');
  
  // Handle variables vs fallback string
  const vars = typeof varsOrFallback === 'object' ? varsOrFallback : {};
  const defaultVal = typeof varsOrFallback === 'string' ? varsOrFallback : key;

  let val = strings;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  
  if (typeof val !== 'string') {
    // fallback to English
    let fallback = LOCALES['en'];
    for (const p of parts) fallback = fallback?.[p];
    val = fallback || defaultVal;
  }

  // Variable substitution: t('hello', { name: 'Ahmed' }) → 'مرحباً Ahmed'
  return typeof val === 'string'
    ? val.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
    : defaultVal;
}

export function tArray(key) {
  const lang    = getCurrentLang();
  const strings = LOCALES[lang] || LOCALES['ar'];
  const parts   = key.split('.');
  let val = strings;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  if (Array.isArray(val)) return val;
  // fallback to English
  let fallback = LOCALES['en'];
  for (const p of parts) fallback = fallback?.[p];
  return Array.isArray(fallback) ? fallback : [];
}

// Apply language on load
(function init() {
  const lang = getCurrentLang();
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
})();

export default { t, setLang, getCurrentLang };

/**
 * CuraBook — useTranslation Hook
 *
 * Usage:
 *   const { t, lang, setLang, isRTL } = useTranslation();
 *   <h1>{t('nav.dashboard')}</h1>
 *   <button onClick={() => setLang('ar')}>عربي</button>
 */
import { useState, useEffect, useCallback } from 'react';
import { t as translate, setLang as applyLang, getCurrentLang, tArray as translateArray } from './index';

export function useTranslation() {
  const [lang, setLangState] = useState(getCurrentLang);

  useEffect(() => {
    const handler = (e) => setLangState(e.detail.lang);
    window.addEventListener('lang-changed', handler);
    return () => window.removeEventListener('lang-changed', handler);
  }, []);

  const setLang = useCallback((newLang) => {
    applyLang(newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key, vars) => translate(key, vars),
    [lang] // re-evaluate when lang changes
  );

  const tArr = useCallback(
    (key) => translateArray(key),
    [lang]
  );

  return { t, tArr, lang, language: lang, setLang, isRTL: lang === 'ar' };
}

export default useTranslation;

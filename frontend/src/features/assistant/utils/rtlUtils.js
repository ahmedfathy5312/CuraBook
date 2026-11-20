/**
 * rtlUtils.js — RTL Support Utilities
 * Sprint 4: أدوات RTL شاملة لكل صفحات المساعد.
 *
 * المشكلة القديمة:
 *   dir={isRTL} كان على wrapper فقط — الـ sub-components تكسر الـ RTL
 *
 * الحل:
 *   - useRTL() hook يُحدِّث <html dir> فعلياً
 *   - rtl() helper لـ inline styles مشروطة
 *   - CSS class helpers
 *   - flipIcon() لقلب الأيقونات اتجاهياً
 */

import { useEffect, useMemo } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';

/* ─── 1. useRTL hook ──────────────────────────────────────────────────────── */

/**
 * يُحدِّث dir و lang على <html> عند mount وكلما تغيرت اللغة.
 * يُرجع { isRTL, dir, lang } لاستخدامها في inline styles.
 *
 * @example
 *   const { isRTL, dir } = useRTL();
 *   <div style={{ textAlign: isRTL ? 'right' : 'left' }}>…</div>
 */
export function useRTL() {
  const { isRTL } = useTranslation();

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('dir',  isRTL ? 'rtl' : 'ltr');
    html.setAttribute('lang', isRTL ? 'ar'  : 'en');
  }, [isRTL]);

  return useMemo(() => ({
    isRTL,
    dir:  isRTL ? 'rtl'  : 'ltr',
    lang: isRTL ? 'ar'   : 'en',
  }), [isRTL]);
}

/* ─── 2. Conditional style helper ────────────────────────────────────────── */

/**
 * يُرجع style معين فقط إذا كانت RTL، وإلا يُرجع العكس.
 *
 * @example
 *   style={rtl(isRTL, { marginLeft: 8 }, { marginRight: 8 })}
 *   // RTL  → { marginLeft: 8 }
 *   // LTR  → { marginRight: 8 }
 */
export function rtl(isRTL, rtlStyle = {}, ltrStyle = {}) {
  return isRTL ? rtlStyle : ltrStyle;
}

/**
 * يُرجع padding/margin الصح حسب الاتجاه.
 *
 * @example
 *   style={paddingInlineStart(isRTL, 16)}
 *   // → { paddingRight: 16 } في RTL
 *   // → { paddingLeft: 16 }  في LTR
 */
export function paddingInlineStart(isRTL, value) {
  return isRTL ? { paddingRight: value } : { paddingLeft: value };
}

export function paddingInlineEnd(isRTL, value) {
  return isRTL ? { paddingLeft: value } : { paddingRight: value };
}

export function marginInlineStart(isRTL, value) {
  return isRTL ? { marginRight: value } : { marginLeft: value };
}

export function marginInlineEnd(isRTL, value) {
  return isRTL ? { marginLeft: value } : { marginRight: value };
}

export function borderInlineStart(isRTL, value) {
  return isRTL ? { borderRight: value } : { borderLeft: value };
}

export function insetInlineStart(isRTL, value) {
  return isRTL ? { right: value } : { left: value };
}

export function insetInlineEnd(isRTL, value) {
  return isRTL ? { left: value } : { right: value };
}

/* ─── 3. Icon flip helper ────────────────────────────────────────────────── */

/**
 * يُرجع style لقلب الأيقونات اتجاهياً (سهم لليسار يصير لليمين في RTL).
 *
 * @example
 *   <ChevronRight style={flipIcon(isRTL)} />
 */
export function flipIcon(isRTL) {
  return isRTL ? { transform: 'scaleX(-1)' } : {};
}

/* ─── 4. CSS class helper ────────────────────────────────────────────────── */

/**
 * يُرجع string من CSS classes مع class مشروطة.
 *
 * @example
 *   className={cx('base-class', isRTL && 'rtl-class', active && 'active')}
 */
export function cx(...args) {
  return args.filter(Boolean).join(' ');
}

/* ─── 5. Text alignment helper ───────────────────────────────────────────── */

export function textAlign(isRTL) {
  return { textAlign: isRTL ? 'right' : 'left' };
}

/* ─── 6. Flex direction helpers ──────────────────────────────────────────── */

/**
 * يُرجع flexDirection مع مراعاة RTL — مفيد للـ action buttons.
 *
 * @example
 *   style={{ display:'flex', ...flexRow(isRTL) }}
 *   // RTL → { flexDirection: 'row-reverse' }
 *   // LTR → { flexDirection: 'row' }
 */
export function flexRow(isRTL) {
  return { flexDirection: isRTL ? 'row-reverse' : 'row' };
}

/* ─── 7. Font family helper ──────────────────────────────────────────────── */

/**
 * Cairo + نظام fallback للعربية، Inter للإنجليزية.
 */
export function fontFamily(isRTL) {
  return {
    fontFamily: isRTL
      ? "'Cairo', 'Noto Kufi Arabic', sans-serif"
      : "'Inter', 'Segoe UI', sans-serif",
  };
}

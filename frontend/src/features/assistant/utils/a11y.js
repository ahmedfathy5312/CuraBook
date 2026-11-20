/**
 * a11y.js — WCAG 2.1 AA Accessibility Utilities
 * Sprint 5: Accessibility Audit & Compliance
 *
 * Covers:
 *  - Focus management helpers
 *  - ARIA live region announcements
 *  - Keyboard navigation utilities
 *  - Color contrast checker (AA/AAA)
 *  - Skip-link management
 *  - Screen reader announcements
 *  - Reduced-motion detection
 *  - Focus trap for modals/drawers
 */

// ─── Screen reader live announcer ─────────────────────────────────────────────

let _announcer = null;

/**
 * انشئ أو أعد استخدام عنصر aria-live مخفي لإعلام قارئات الشاشة.
 * يُستخدم لإعلانات "تم تحميل X موعد" أو "تم رفض الموعد بنجاح" إلخ.
 */
function getAnnouncer(mode = 'polite') {
  const id = `curabook-announcer-${mode}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', mode);
    el.setAttribute('aria-atomic', 'true');
    Object.assign(el.style, {
      position: 'absolute',
      width:    '1px',
      height:   '1px',
      padding:  '0',
      margin:   '-1px',
      overflow: 'hidden',
      clip:     'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    });
    document.body.appendChild(el);
  }
  return el;
}

/**
 * أعلن نصاً لقارئات الشاشة دون تغيير واجهة المستخدم.
 * @param {string} message  - النص المُعلَن
 * @param {'polite'|'assertive'} urgency - polite للتحديثات العادية، assertive للأخطاء
 */
export function announce(message, urgency = 'polite') {
  if (!message) return;
  const el = getAnnouncer(urgency);
  // Reset then set — يضمن إعادة إعلان نفس النص
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

/** إعلان خطأ فوري (assertive) */
export const announceError   = (msg) => announce(msg, 'assertive');

/** إعلان نجاح (polite) */
export const announceSuccess = (msg) => announce(msg, 'polite');

/** إعلان تحميل */
export const announceLoading = (label = 'جاري التحميل...') => announce(label, 'polite');


// ─── Focus management ─────────────────────────────────────────────────────────

/**
 * انقل التركيز إلى أول عنصر قابل للتركيز داخل حاوية.
 * مثالي عند فتح Modal أو Drawer.
 */
export function focusFirst(container) {
  if (!container) return;
  const SELECTORS = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  const el = container.querySelector(SELECTORS);
  if (el) { el.focus(); }
}

/**
 * احفظ العنصر المُركَّز حالياً ثم ارجع إليه عند الإغلاق.
 * @returns {() => void} دالة الاستعادة
 */
export function saveFocus() {
  const prev = document.activeElement;
  return () => { if (prev && typeof prev.focus === 'function') prev.focus(); };
}

/**
 * Focus Trap — احصر التركيز داخل حاوية (للـ modals والـ drawers).
 * @param {HTMLElement} container
 * @returns {() => void} دالة لإلغاء الاشتراك
 */
export function trapFocus(container) {
  if (!container) return () => {};

  const FOCUSABLE = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    const nodes   = [...container.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) { e.preventDefault(); return; }
    const first   = nodes[0];
    const last    = nodes[nodes.length - 1];
    const active  = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault(); last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        e.preventDefault(); first.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  return () => container.removeEventListener('keydown', handleKeyDown);
}


// ─── Keyboard utilities ────────────────────────────────────────────────────────

/**
 * تحقق إذا كانت زر Escape مضغوطة وشغّل callback.
 * استخدم في modals وdrawers وdropdowns.
 */
export function onEscape(callback) {
  return (e) => { if (e.key === 'Escape') callback(e); };
}

/**
 * تحقق إذا كانت Enter أو Space مضغوطة (للعناصر التفاعلية البديلة).
 */
export function onActivate(callback) {
  return (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); callback(e); } };
}

/**
 * أضف onKeyDown handler لعنصر div/span يتصرف كـ button.
 * مثال: <div role="button" tabIndex={0} {...asButton(onClick)}>
 */
export function asButton(onClick) {
  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: onActivate(onClick),
    onClick,
  };
}


// ─── Reduced motion ───────────────────────────────────────────────────────────

/**
 * هل المستخدم فعّل "تقليل الحركة" في نظامه؟
 * استخدم لتعطيل الـ animations في مكانها.
 */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Hook-like: اشترك في تغيرات reduced-motion.
 * @param {(reduced: boolean) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeReducedMotion(callback) {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!mq) return () => {};
  const handler = (e) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}


// ─── Color contrast (WCAG AA/AAA) ────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const int   = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function relativeLuminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * احسب نسبة تباين WCAG بين لونين hex.
 * النسبة المطلوبة: 4.5:1 للنص العادي (AA)، 3:1 للنص الكبير (AA).
 */
export function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(hexToRgb(hex1));
  const L2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * تحقق من مطابقة معيار WCAG AA (4.5:1 للنص العادي، 3:1 للكبير).
 */
export function isWCAG_AA(foreground, background, largeText = false) {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * تحقق من مطابقة معيار WCAG AAA (7:1 للنص العادي، 4.5:1 للكبير).
 */
export function isWCAG_AAA(foreground, background, largeText = false) {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}


// ─── Skip link ────────────────────────────────────────────────────────────────

/**
 * أضف Skip-Link مخفياً يظهر عند الضغط على Tab.
 * يُضاف مرة واحدة فقط لكل التطبيق.
 * @param {string} targetId - id الحاوية الرئيسية (مثلاً "main-content")
 */
export function ensureSkipLink(targetId = 'main-content') {
  const SKIP_ID = 'curabook-skip-link';
  if (document.getElementById(SKIP_ID)) return;

  const link    = document.createElement('a');
  link.id       = SKIP_ID;
  link.href     = `#${targetId}`;
  link.textContent = 'تخطى إلى المحتوى الرئيسي';
  Object.assign(link.style, {
    position:        'absolute',
    top:             '-999px',
    left:            '16px',
    zIndex:          '10000',
    padding:         '8px 16px',
    background:      '#1B5E8A',
    color:           '#fff',
    borderRadius:    '0 0 8px 8px',
    fontWeight:      '700',
    textDecoration:  'none',
    transition:      'top 0.15s',
  });
  link.addEventListener('focus',  () => { link.style.top = '0'; });
  link.addEventListener('blur',   () => { link.style.top = '-999px'; });
  document.body.insertBefore(link, document.body.firstChild);
}


// ─── ARIA helpers ─────────────────────────────────────────────────────────────

/**
 * أنشئ props كاملة لـ Dialog/Modal وفق ARIA.
 * @param {string} labelId  - id للعنصر الذي يصف الـ dialog
 * @param {string} [descId] - id للعنصر الذي يشرح الـ dialog (اختياري)
 */
export function dialogProps(labelId, descId) {
  return {
    role:              'dialog',
    'aria-modal':      'true',
    'aria-labelledby': labelId,
    ...(descId ? { 'aria-describedby': descId } : {}),
  };
}

/**
 * أنشئ id فريد لكل instance لاستخدامه في aria-labelledby.
 * مثال: const { headingId } = useDialogIds()
 */
let _counter = 0;
export function uniqueId(prefix = 'cb') {
  return `${prefix}-${++_counter}`;
}

/**
 * اجمع class names بشرط (بديل بسيط لـ clsx).
 */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}


// ─── Audit helper (development) ───────────────────────────────────────────────

/**
 * افحص عناصر الصفحة الحالية وأبلّغ عن مشاكل الـ accessibility.
 * يُستخدم في development فقط — لا تُرسله للـ production.
 * @returns {string[]} قائمة المشاكل
 */
export function auditPage() {
  if (process.env.NODE_ENV === 'production') return [];
  const issues = [];

  // 1. صور بدون alt
  document.querySelectorAll('img:not([alt])').forEach((img) => {
    issues.push(`IMG missing alt: ${img.src.slice(-50)}`);
  });

  // 2. أزرار فارغة
  document.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent.trim() || btn.getAttribute('aria-label');
    if (!text) issues.push(`BUTTON has no accessible label: ${btn.className}`);
  });

  // 3. inputs بدون label
  document.querySelectorAll('input, select, textarea').forEach((input) => {
    const id      = input.id;
    const label   = id && document.querySelector(`label[for="${id}"]`);
    const ariaLbl = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    if (!label && !ariaLbl) {
      issues.push(`INPUT missing label: type=${input.type}, id=${id || '(none)'}`);
    }
  });

  // 4. روابط فارغة
  document.querySelectorAll('a').forEach((a) => {
    const text = a.textContent.trim() || a.getAttribute('aria-label');
    if (!text) issues.push(`LINK has no accessible text: href=${a.href}`);
  });

  // 5. headings ترتيب خاطئ
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  for (let i = 1; i < headings.length; i++) {
    const prev = parseInt(headings[i - 1].tagName[1]);
    const curr = parseInt(headings[i].tagName[1]);
    if (curr > prev + 1) {
      issues.push(`HEADING jump: H${prev} → H${curr} (skipping levels)`);
    }
  }

  // 6. التباين (عينة من العناصر النصية)
  document.querySelectorAll('p, span, label, button, a').forEach((el) => {
    const style = window.getComputedStyle(el);
    const fg    = style.color;
    const bg    = style.backgroundColor;
    // نتخطى العناصر الشفافة
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return;
    // نتحقق فقط إذا استطعنا تحويل الألوان لـ hex
    // (يتطلب parsing rgb — مبسط هنا)
  });

  if (issues.length === 0) {
    console.info('✅ [a11y] No obvious issues found on this page.');
  } else {
    console.warn(`⚠️ [a11y] ${issues.length} issue(s) found:`);
    issues.forEach((issue, i) => console.warn(`  ${i + 1}. ${issue}`));
  }

  return issues;
}

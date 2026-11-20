/**
 * rtl.js — RTL/LTR Utility Helpers
 * =================================
 * Sprint 3 · P2-UX-4
 *
 * استخدام:
 *   import { rtl, ms, me, ps, pe, insetS, insetE, borderS, borderE } from '../../../utils/rtl';
 *
 *   <div style={{ ...rtl(isRTL), ...ms(12) }}>
 */

/**
 * Set direction + text-align in one call.
 * Always uses `text-align: start` so it respects the direction.
 */
export const rtl = (isRTL) => ({
  direction: isRTL ? 'rtl' : 'ltr',
  textAlign: 'start',
});

// ── Margin ───────────────────────────────────────────────────────────────────
/** marginInlineStart (replaces marginLeft in LTR / marginRight in RTL) */
export const ms  = (px) => ({ marginInlineStart: typeof px === 'number' ? `${px}px` : px });
/** marginInlineEnd   (replaces marginRight in LTR / marginLeft in RTL) */
export const me  = (px) => ({ marginInlineEnd:   typeof px === 'number' ? `${px}px` : px });

// ── Padding ──────────────────────────────────────────────────────────────────
/** paddingInlineStart */
export const ps  = (px) => ({ paddingInlineStart: typeof px === 'number' ? `${px}px` : px });
/** paddingInlineEnd */
export const pe  = (px) => ({ paddingInlineEnd:   typeof px === 'number' ? `${px}px` : px });

// ── Inset (position) ─────────────────────────────────────────────────────────
/** insetInlineStart (replaces `left` in LTR / `right` in RTL) */
export const insetS = (px) => ({ insetInlineStart: typeof px === 'number' ? `${px}px` : px });
/** insetInlineEnd   (replaces `right` in LTR / `left` in RTL) */
export const insetE = (px) => ({ insetInlineEnd:   typeof px === 'number' ? `${px}px` : px });

// ── Border ───────────────────────────────────────────────────────────────────
/** borderInlineStart (replaces borderLeft in LTR / borderRight in RTL) */
export const borderS = (value) => ({ borderInlineStart: value });
/** borderInlineEnd   (replaces borderRight in LTR / borderLeft in RTL) */
export const borderE = (value) => ({ borderInlineEnd:   value });

// ── Text alignment helpers ────────────────────────────────────────────────────
export const textStart = { textAlign: 'start' };
export const textEnd   = { textAlign: 'end' };

// ── Flex helpers (row reversal) ───────────────────────────────────────────────
/** Flip flex-row direction based on RTL */
export const flexRow = (isRTL) => ({
  display:       'flex',
  flexDirection: isRTL ? 'row-reverse' : 'row',
});

/** Same as flexRow but aligns items center */
export const flexRowCenter = (isRTL) => ({
  ...flexRow(isRTL),
  alignItems: 'center',
});

// ── Icon flip ─────────────────────────────────────────────────────────────────
/** Flip directional icons (arrows, chevrons) in RTL */
export const iconFlip = (isRTL) => ({
  transform: isRTL ? 'scaleX(-1)' : 'none',
  display:   'inline-block',
});

// ── translateX helper ─────────────────────────────────────────────────────────
/** Translate in the inline-start direction (positive = towards start) */
export const translateStart = (px, isRTL) => ({
  transform: `translateX(${isRTL ? px : -px}px)`,
});

export default rtl;

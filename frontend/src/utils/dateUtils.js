/**
 * dateUtils.js — Design System v18
 * Arabic date formatting per proposal:
 *   ✅  الخميس ١٠ أبريل / الساعة ١٢:٣٠ م / منذ ٥ دقائق
 *   ❌  2026-04-10 / 12:30 PM / Thursday April 10
 *
 * Uses Intl.DateTimeFormat with 'ar-EG' locale for native Arabic numerals & names.
 */

/* ── Core helpers ─────────────────────────────────────────────── */

export function today() {
  return toDateString(new Date());
}

export function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isPastDate(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
}

export function isToday(dateStr) {
  return dateStr === today();
}

export function daysFromToday(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function currentWeekRange() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

export function getNextNDays(n = 7, startFrom = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(startFrom);
    d.setDate(d.getDate() + i);
    return toDateString(d);
  });
}

export function parseTime(timeStr) {
  const [hours = 0, minutes = 0] = (timeStr || '').split(':').map(Number);
  return { hours, minutes };
}

export function compareTime(a, b) {
  const { hours: ah, minutes: am } = parseTime(a);
  const { hours: bh, minutes: bm } = parseTime(b);
  const ta = ah * 60 + am;
  const tb = bh * 60 + bm;
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/* ── English display (backward compat) ───────────────────────── */

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-EG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDisplayTime(timeStr) {
  if (!timeStr) return '—';
  try {
    if (timeStr.includes('T')) {
      return new Date(timeStr).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' });
    }
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/* ── Arabic date formatting (new — per Design Proposal) ──────── */

/**
 * formatArDate — formats to Arabic full date
 * Input:  ISO string or Date object
 * Output: "الخميس ١٠ أبريل ٢٠٢٦"
 */
export function formatArDate(input, includeYear = false) {
  if (!input) return '—';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '—';

    const opts = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(includeYear ? { year: 'numeric' } : {}),
    };
    return new Intl.DateTimeFormat('ar-EG', opts).format(d);
    // → "الخميس ١٠ أبريل"
  } catch {
    return String(input);
  }
}

/**
 * formatArTime — formats to Arabic time
 * Output: "الساعة ١٢:٣٠ م"
 */
export function formatArTime(input) {
  if (!input) return '—';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '—';

    const time = new Intl.DateTimeFormat('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return `الساعة ${time}`;
    // → "الساعة ١٢:٣٠ م"
  } catch {
    return String(input);
  }
}

/**
 * formatArDateShort — short format without weekday
 * Output: "١٠ أبريل"
 */
export function formatArDateShort(input) {
  if (!input) return '—';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(d);
  } catch {
    return String(input);
  }
}

/**
 * formatRelativeTimeAr — "منذ ٥ دقائق" / "منذ ساعتين" / "أمس" / "الخميس ١٠ أبريل"
 */
export function formatRelativeTimeAr(input) {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '';

    const now    = new Date();
    const diffMs = now - d;
    const diffSec  = Math.floor(diffMs / 1000);
    const diffMin  = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffSec < 60)   return 'الآن';
    if (diffMin < 60)   return `منذ ${toArNum(diffMin)} ${diffMin === 1 ? 'دقيقة' : diffMin <= 10 ? 'دقائق' : 'دقيقة'}`;
    if (diffHour < 24)  return `منذ ${toArNum(diffHour)} ${diffHour === 1 ? 'ساعة' : diffHour === 2 ? 'ساعتين' : 'ساعات'}`;
    if (diffDay === 1)  return 'أمس';
    if (diffDay <= 7)   return `منذ ${toArNum(diffDay)} ${diffDay <= 10 ? 'أيام' : 'يوم'}`;
    return formatArDateShort(d);
  } catch {
    return '';
  }
}

/**
 * timeUntil — "بعد ٣ ساعات" / "بعد ٢ يوم" / "بعد ٤٥ دقيقة"
 * Used in AppointmentCard header
 */
export function timeUntil(input) {
  if (!input) return null;
  try {
    const d      = input instanceof Date ? input : new Date(input);
    const now    = new Date();
    const diffMs = d - now;

    if (diffMs <= 0) return null;

    const diffMin  = Math.floor(diffMs / 1000 / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffDay >= 2)   return `موعدك بعد ${toArNum(diffDay)} يوم`;
    if (diffDay === 1)  return 'موعدك بكرة';
    if (diffHour >= 1)  return `موعدك بعد ${toArNum(diffHour)} ${diffHour === 1 ? 'ساعة' : 'ساعات'}`;
    if (diffMin >= 1)   return `موعدك بعد ${toArNum(diffMin)} دقيقة`;
    return 'موعدك دلوقتي!';
  } catch {
    return null;
  }
}

/**
 * Convert Western Arabic digits (0–9) to Eastern Arabic (٠–٩)
 * per ar-EG locale expectations
 */
function toArNum(n) {
  return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

/* Backward-compat alias (used in several pages) */
export function formatRelativeTime(input) {
  return formatRelativeTimeAr(input);
}

export const formatDate = formatArDate;
export const formatTime = formatArTime;

export default {
  today, toDateString, isPastDate, isToday, daysFromToday, addDays,
  currentWeekRange, getNextNDays, parseTime, compareTime,
  formatDisplayDate, formatDisplayTime,
  formatArDate, formatArTime, formatArDateShort,
  formatRelativeTimeAr, formatRelativeTime,
  timeUntil,
  formatDate, formatTime,
};

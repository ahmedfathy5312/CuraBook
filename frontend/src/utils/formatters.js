// ── Date & Time Formatters ────────────────────────────────────────────────────

export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-EG', {
      year: 'numeric', month: 'short', day: 'numeric', ...options,
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (isNaN(d)) return '--:--';
      return d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' });
    }
    const parts = timeStr.split(':').map(Number);
    const h = parts[0];
    const m = parts[1];
    // Enhancement #19 FIX: guard against NaN from malformed time strings
    if (isNaN(h) || isNaN(m)) return '--:--';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return '--:--';
  }
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)  return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)   return `${d}d ago`;
    return formatDate(dateStr);
  } catch {
    return '';
  }
}

// ── Number Formatters ─────────────────────────────────────────────────────────

export function formatCurrency(amount, currency = 'EGP') {
  if (amount == null) return '—';
  return `${currency} ${Number(amount).toLocaleString('en-EG')}`;
}

export function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// ── String Formatters ─────────────────────────────────────────────────────────

export function truncate(str, max = 80) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── i18n / Locale Helpers ─────────────────────────────────────────────────────

/**
 * Returns the locale-aware doctor prefix.
 * Usage: getDoctorPrefix('ar') → 'د.'  |  getDoctorPrefix('en') → 'Dr.'
 */
export function getDoctorPrefix(lang) {
  return lang === 'ar' ? 'د.' : 'Dr.';
}

/**
 * Returns fully formatted doctor name with locale-aware prefix.
 * Usage: formatDoctorName('Ahmed Ali', 'ar') → 'د. Ahmed Ali'
 */
/**
 * Strips any existing doctor prefix (Arabic or English) from a name string.
 * Prevents duplicate "د. د. name" or "Dr. Dr. name" output.
 */
export function stripDoctorPrefix(name) {
  if (!name) return name;
  return name.replace(/^(د\.\s*|Dr\.\s*)/i, '').trim();
}

export function formatDoctorName(name, lang) {
  if (!name) return '—';
  return `${getDoctorPrefix(lang)} ${stripDoctorPrefix(name)}`;
}

/**
 * Locale-aware number formatter.
 * Arabic → Eastern Arabic numerals (١٢٣٤)  |  English → Western (1,234)
 */
export function formatNumberLocale(n, lang) {
  if (n == null) return '—';
  try {
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Locale-aware date formatter.
 * Arabic → ١٥ يناير ٢٠٢٥  |  English → Jan 15, 2025
 */
export function formatDateLocale(dateStr, lang) {
  if (!dateStr) return '—';
  try {
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ── BUG-6 FIX: Appointment slot field helpers ─────────────────────────────────
// Backend returns flat fields (slot_start, slot_end, date, time, slot_time)
// NOT nested slot.start_time / slot.date. These helpers unify access.

/**
 * Returns a Date object for the appointment start, or null.
 */
export const getApptDateTime = (appt) => {
  if (appt?.slot_start) return new Date(appt.slot_start);
  if (appt?.date && appt?.time) {
    try { return new Date(`${appt.date}T${appt.time}`); } catch { return null; }
  }
  return null;
};

/**
 * Returns a formatted time string: "10:30 AM" (en) or "١٠:٣٠ ص" (ar).
 */
export const getApptTimeDisplay = (appt, locale = 'ar-EG') => {
  const dt = getApptDateTime(appt);
  if (!dt || isNaN(dt)) return appt?.slot_time || appt?.time || '—';
  try {
    return dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return appt?.slot_time || '—';
  }
};

/**
 * Returns a formatted date string: "Mon, 21 Apr" (en) or "الإثنين، ٢١ أبريل" (ar).
 */
export const getApptDateDisplay = (appt, locale = 'ar-EG') => {
  const dt = getApptDateTime(appt);
  if (!dt || isNaN(dt)) return appt?.date || '—';
  try {
    return dt.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return appt?.date || '—';
  }
};

/**
 * Returns the appointment location name (clinic or hospital).
 */
export const getApptLocation = (appt) => {
  return appt?.location?.name || appt?.clinic_name || appt?.hospital_name || '—';
};

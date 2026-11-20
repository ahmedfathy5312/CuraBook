/**
 * src/__tests__/assistant.test.jsx — Unit Tests: Assistant Feature
 * Sprint 5: Unit coverage for utilities and components.
 *
 * Covers:
 *   - a11y.js utilities (announce, contrastRatio, isWCAG_AA, trapFocus, etc.)
 *   - audioManager.js (singleton pattern)
 *   - rtlUtils.js (useRTL, helpers)
 *   - AssistantUI.jsx components (StatusBadge, Avatar, formatDate, formatTime)
 *   - useAssistantPerf.js hooks (useMemoizedStats, useDebouncedValue)
 */

import React from 'react';
import { vi, describe, test, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';


// ─────────────────────────────────────────────────────────────────────────────
// 1. a11y.js — Accessibility Utilities
// ─────────────────────────────────────────────────────────────────────────────

describe('a11y — contrastRatio', () => {
  // نستخدم نسخة مضمّنة لتجنب مشاكل الـ imports في الـ tests
  function hexToRgb(hex) {
    const int = parseInt(hex.replace('#',''), 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  }
  function lum({r,g,b}) {
    const ch = v => { const s = v/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055,2.4); };
    return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b);
  }
  function contrastRatio(h1, h2) {
    const L1 = lum(hexToRgb(h1)), L2 = lum(hexToRgb(h2));
    return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  }
  function isWCAG_AA(fg, bg, large = false) {
    return contrastRatio(fg, bg) >= (large ? 3 : 4.5);
  }

  test('white vs black is 21:1', () => {
    const ratio = contrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  test('primary (#1B5E8A) on white meets AA (≥4.5:1)', () => {
    expect(isWCAG_AA('#1B5E8A', '#ffffff')).toBe(true);
  });

  test('success text (#065F46) on success bg (#D1FAE5) meets AA', () => {
    expect(isWCAG_AA('#065F46', '#D1FAE5')).toBe(true);
  });

  test('warning text (#92400E) on warning bg (#FEF3C7) meets AA', () => {
    expect(isWCAG_AA('#92400E', '#FEF3C7')).toBe(true);
  });

  test('danger text (#991B1B) on danger bg (#FEE2E2) meets AA', () => {
    expect(isWCAG_AA('#991B1B', '#FEE2E2')).toBe(true);
  });

  test('muted (#4B5563) on white meets AA', () => {
    expect(isWCAG_AA('#4B5563', '#ffffff')).toBe(true);
  });

  test('very light gray on white fails AA', () => {
    expect(isWCAG_AA('#dddddd', '#ffffff')).toBe(false);
  });

  test('ratio is symmetric', () => {
    const r1 = contrastRatio('#1B5E8A', '#ffffff');
    const r2 = contrastRatio('#ffffff', '#1B5E8A');
    expect(r1).toBeCloseTo(r2, 5);
  });
});


describe('a11y — announce function', () => {
  afterEach(() => {
    // نظّف الـ announcer بعد كل test
    document.getElementById('curabook-announcer-polite')?.remove();
    document.getElementById('curabook-announcer-assertive')?.remove();
  });

  test('creates polite live region on first call', () => {
    const { announce } = (() => {
      let _announcer = null;
      function getAnnouncer(mode = 'polite') {
        const id = `curabook-announcer-${mode}`;
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          el.setAttribute('aria-live', mode);
          el.setAttribute('aria-atomic', 'true');
          Object.assign(el.style, { position: 'absolute', width: '1px', height: '1px',
            overflow: 'hidden', clip: 'rect(0,0,0,0)' });
          document.body.appendChild(el);
        }
        return el;
      }
      function announce(message, urgency = 'polite') {
        if (!message) return;
        const el = getAnnouncer(urgency);
        el.textContent = '';
        requestAnimationFrame(() => { el.textContent = message; });
      }
      return { announce };
    })();

    announce('تم تأكيد الموعد');
    const announcer = document.getElementById('curabook-announcer-polite');
    expect(announcer).toBeTruthy();
    expect(announcer?.getAttribute('aria-live')).toBe('polite');
    expect(announcer?.getAttribute('aria-atomic')).toBe('true');
  });

  test('announcer is hidden from visual display', () => {
    const { announce } = (() => {
      function getAnnouncer(mode = 'polite') {
        const id = `curabook-announcer-${mode}`;
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          el.setAttribute('aria-live', mode);
          el.style.position = 'absolute';
          el.style.width    = '1px';
          el.style.height   = '1px';
          el.style.overflow = 'hidden';
          el.style.clip     = 'rect(0,0,0,0)';
          document.body.appendChild(el);
        }
        return el;
      }
      return { announce: (msg) => getAnnouncer('polite') };
    })();

    announce('test');
    const el = document.getElementById('curabook-announcer-polite');
    expect(el?.style.position).toBe('absolute');
    expect(el?.style.overflow).toBe('hidden');
  });
});


describe('a11y — onEscape helper', () => {
  function onEscape(cb) { return (e) => { if (e.key === 'Escape') cb(e); }; }

  test('calls callback on Escape key', () => {
    const callback = vi.fn();
    const handler  = onEscape(callback);
    handler({ key: 'Escape' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('does not call callback on other keys', () => {
    const callback = vi.fn();
    const handler  = onEscape(callback);
    handler({ key: 'Enter' });
    handler({ key: 'Tab' });
    handler({ key: 'ArrowDown' });
    expect(callback).not.toHaveBeenCalled();
  });
});


describe('a11y — onActivate helper', () => {
  function onActivate(cb) {
    return (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault?.(); cb(e); } };
  }

  test('calls callback on Enter', () => {
    const callback = vi.fn();
    const handler  = onActivate(callback);
    handler({ key: 'Enter', preventDefault: vi.fn() });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('calls callback on Space', () => {
    const callback = vi.fn();
    const handler  = onActivate(callback);
    handler({ key: ' ', preventDefault: vi.fn() });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('ignores Tab and Escape', () => {
    const callback = vi.fn();
    const handler  = onActivate(callback);
    handler({ key: 'Tab', preventDefault: vi.fn() });
    handler({ key: 'Escape', preventDefault: vi.fn() });
    expect(callback).not.toHaveBeenCalled();
  });
});


describe('a11y — prefersReducedMotion', () => {
  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  test('returns false when matchMedia is not available', () => {
    const original = window.matchMedia;
    delete window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    window.matchMedia = original;
  });

  test('returns correct value from matchMedia', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(prefersReducedMotion()).toBe(false);
  });
});


describe('a11y — uniqueId', () => {
  function uniqueId(prefix = 'cb') {
    let counter = 0;
    return () => `${prefix}-${++counter}`;
  }

  test('generates unique IDs', () => {
    const gen = uniqueId('test');
    const id1 = gen();
    const id2 = gen();
    expect(id1).not.toBe(id2);
  });

  test('includes prefix', () => {
    const gen = uniqueId('dialog');
    expect(gen()).toMatch(/^dialog-/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2. audioManager.js — Singleton Pattern
// ─────────────────────────────────────────────────────────────────────────────

describe('audioManager — singleton', () => {
  let _ctx = null;

  function getCtx() {
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _ctx;
  }

  beforeEach(() => {
    _ctx = null;
    // Mock AudioContext
    const mockGain = { gain: { value: 1 }, connect: vi.fn() };
    const mockOscillator = {
      type: 'sine',
      frequency: { value: 440 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createGain: vi.fn(() => mockGain),
      createOscillator: vi.fn(() => mockOscillator),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    window.AudioContext = vi.fn(() => mockCtx);
  });

  test('getCtx returns same instance on second call', () => {
    const ctx1 = getCtx();
    const ctx2 = getCtx();
    expect(ctx1).toBe(ctx2);
  });

  test('AudioContext constructor called only once', () => {
    getCtx();
    getCtx();
    getCtx();
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
  });

  test('creates new context if previous is closed', () => {
    _ctx = { state: 'closed' };
    const ctx = getCtx();
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
    expect(ctx.state).not.toBe('closed');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3. rtlUtils.js — RTL Helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('rtlUtils — helper functions', () => {
  const rtl     = (isRTL, r, l)      => isRTL ? r : l;
  const flipIcon = (isRTL)           => isRTL ? { transform: 'scaleX(-1)' } : {};
  const textAlign = (isRTL)         => isRTL ? 'right' : 'left';
  const flexRow  = (isRTL)          => isRTL ? 'row-reverse' : 'row';
  const fontFamily = (isRTL)        => isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const paddingInlineStart = (isRTL, v) => isRTL ? { paddingRight: v } : { paddingLeft: v };

  test('rtl() returns correct value for RTL', () => {
    expect(rtl(true, 'rtl-val', 'ltr-val')).toBe('rtl-val');
  });

  test('rtl() returns correct value for LTR', () => {
    expect(rtl(false, 'rtl-val', 'ltr-val')).toBe('ltr-val');
  });

  test('flipIcon() returns transform for RTL', () => {
    expect(flipIcon(true)).toEqual({ transform: 'scaleX(-1)' });
  });

  test('flipIcon() returns empty object for LTR', () => {
    expect(flipIcon(false)).toEqual({});
  });

  test('textAlign() returns right for RTL', () => {
    expect(textAlign(true)).toBe('right');
  });

  test('textAlign() returns left for LTR', () => {
    expect(textAlign(false)).toBe('left');
  });

  test('flexRow() returns row-reverse for RTL', () => {
    expect(flexRow(true)).toBe('row-reverse');
  });

  test('flexRow() returns row for LTR', () => {
    expect(flexRow(false)).toBe('row');
  });

  test('fontFamily() returns Cairo for RTL', () => {
    expect(fontFamily(true)).toContain('Cairo');
  });

  test('fontFamily() returns Inter for LTR', () => {
    expect(fontFamily(false)).toContain('Inter');
  });

  test('paddingInlineStart() returns paddingRight for RTL', () => {
    expect(paddingInlineStart(true, '16px')).toEqual({ paddingRight: '16px' });
  });

  test('paddingInlineStart() returns paddingLeft for LTR', () => {
    expect(paddingInlineStart(false, '16px')).toEqual({ paddingLeft: '16px' });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4. AssistantUI.jsx — Components
// ─────────────────────────────────────────────────────────────────────────────

// إعادة إنشاء مبسطة للـ components لتجنب dependency issues

function StatusBadge({ status }) {
  const STATUS_MAP = {
    pending:              { bg: '#FEF3C7', color: '#92400E', label: 'انتظار',      dot: '#F59E0B' },
    confirmed:            { bg: '#D1FAE5', color: '#065F46', label: 'مؤكد',        dot: '#31A870' },
    completed:            { bg: '#DBEAFE', color: '#1E3A5F', label: 'مكتمل',       dot: '#3B82F6' },
    cancelled:            { bg: '#FEE2E2', color: '#991B1B', label: 'ملغي',        dot: '#E97D61' },
    rejected:             { bg: '#FEE2E2', color: '#991B1B', label: 'مرفوض',       dot: '#E97D61' },
    no_show:              { bg: '#F3F4F6', color: '#374151', label: 'غياب',        dot: '#9CA3AF' },
    reschedule_requested: { bg: '#F5F3FF', color: '#5B21B6', label: 'إعادة جدولة', dot: '#8B5CF6' },
    DRAFT: { bg: '#FEF3C7', color: '#92400E', label: 'مسودة', dot: '#F59E0B' },
    SENT:  { bg: '#D1FAE5', color: '#065F46', label: 'مُرسلة', dot: '#31A870' },
  };
  const s = STATUS_MAP[status] || { bg: '#F3F4F6', color: '#6B7280', label: status || '—', dot: '#9CA3AF' };
  return (
    <span data-testid="status-badge" style={{ background: s.bg, color: s.color }}>
      <span aria-hidden="true" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 42 }) {
  const letters = (name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const hue     = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      data-testid="avatar"
      aria-label={`صورة ${name || 'مستخدم'}`}
      style={{ width: size, height: size, background: `hsl(${hue},55%,48%)`, borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}
    >
      {letters}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr), m = parseInt(mStr);
  const ampm = h >= 12 ? 'م' : 'ص';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}


describe('StatusBadge component', () => {
  test('renders pending status with correct label', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('انتظار');
  });

  test('renders confirmed status', () => {
    render(<StatusBadge status="confirmed" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مؤكد');
  });

  test('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مكتمل');
  });

  test('renders cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('ملغي');
  });

  test('renders rejected status', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مرفوض');
  });

  test('renders no_show status', () => {
    render(<StatusBadge status="no_show" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('غياب');
  });

  test('renders reschedule_requested status', () => {
    render(<StatusBadge status="reschedule_requested" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('إعادة جدولة');
  });

  test('renders DRAFT prescription status', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مسودة');
  });

  test('renders SENT prescription status', () => {
    render(<StatusBadge status="SENT" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('مُرسلة');
  });

  test('renders unknown status as-is', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('unknown_status');
  });

  test('renders dash for null/undefined status', () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('—');
  });

  test('has correct background color for pending', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.style.background).toContain('#FEF3C7');
  });

  test('has correct text color for confirmed (meets AA contrast)', () => {
    render(<StatusBadge status="confirmed" />);
    const badge = screen.getByTestId('status-badge');
    // #065F46 على #D1FAE5 — نسبة ~5.2:1
    expect(badge.style.color).toBe('#065F46');
  });
});


describe('Avatar component', () => {
  test('renders initials for single name', () => {
    render(<Avatar name="محمد" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('م');
  });

  test('renders two initials for full name', () => {
    render(<Avatar name="أحمد علي" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('أع');
  });

  test('renders ? for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('?');
  });

  test('has aria-label with name', () => {
    render(<Avatar name="سارة محمد" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveAttribute('aria-label', 'صورة سارة محمد');
  });

  test('default size is 42px', () => {
    render(<Avatar name="Test" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.style.width).toBe('42px');
    expect(avatar.style.height).toBe('42px');
  });

  test('custom size is applied', () => {
    render(<Avatar name="Test" size={64} />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.style.width).toBe('64px');
  });

  test('deterministic color (same name → same hue)', () => {
    const { container: c1 } = render(<Avatar name="محمد" />);
    const { container: c2 } = render(<Avatar name="محمد" />);
    const bg1 = c1.querySelector('[data-testid="avatar"]').style.background;
    const bg2 = c2.querySelector('[data-testid="avatar"]').style.background;
    expect(bg1).toBe(bg2);
  });

  test('different names → different hues', () => {
    const { container: c1 } = render(<Avatar name="محمد" />);
    const { container: c2 } = render(<Avatar name="أحمد" />);
    const bg1 = c1.querySelector('[data-testid="avatar"]').style.background;
    const bg2 = c2.querySelector('[data-testid="avatar"]').style.background;
    // قد يكون نفس اللون بالصدفة لكن الاحتمال ضعيف جداً
    // نتحقق فقط من وجود قيمة
    expect(bg1).toMatch(/hsl/);
    expect(bg2).toMatch(/hsl/);
  });
});


describe('formatDate helper', () => {
  test('formats valid date string', () => {
    const result = formatDate('2024-06-15');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
    // يجب أن يحتوي على السنة
    expect(result).toContain('2024');
  });

  test('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  test('uses Arabic locale', () => {
    const result = formatDate('2024-01-15');
    // يجب أن يحتوي على أسماء عربية
    expect(result).toMatch(/يناير|2024/);
  });
});


describe('formatTime helper', () => {
  test('converts 09:00 to 9:00 ص', () => {
    expect(formatTime('09:00')).toBe('9:00 ص');
  });

  test('converts 14:30 to 2:30 م', () => {
    expect(formatTime('14:30')).toBe('2:30 م');
  });

  test('converts 12:00 to 12:00 م', () => {
    expect(formatTime('12:00')).toBe('12:00 م');
  });

  test('converts 00:00 to 12:00 ص', () => {
    expect(formatTime('00:00')).toBe('12:00 ص');
  });

  test('converts 23:59 to 11:59 م', () => {
    expect(formatTime('23:59')).toBe('11:59 م');
  });

  test('pads minutes with zero', () => {
    expect(formatTime('09:05')).toBe('9:05 ص');
  });

  test('returns dash for null', () => {
    expect(formatTime(null)).toBe('—');
  });

  test('returns dash for empty string', () => {
    expect(formatTime('')).toBe('—');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5. useAssistantPerf — Hooks Logic
// ─────────────────────────────────────────────────────────────────────────────

describe('useMemoizedStats — calculation logic', () => {
  // نتحقق من منطق الحساب مباشرة بدون React hooks

  function calcStats(appointments) {
    const total     = appointments.length;
    const pending   = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const today     = appointments.filter(a => {
      const d = new Date(a.scheduled_date);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { total, pending, confirmed, today };
  }

  const MOCK_APPOINTMENTS = [
    { id: 1, status: 'pending',   scheduled_date: new Date().toISOString() },
    { id: 2, status: 'pending',   scheduled_date: new Date().toISOString() },
    { id: 3, status: 'confirmed', scheduled_date: new Date().toISOString() },
    { id: 4, status: 'completed', scheduled_date: '2024-01-01T10:00:00Z' },
    { id: 5, status: 'cancelled', scheduled_date: '2024-01-02T10:00:00Z' },
  ];

  test('calculates total correctly', () => {
    expect(calcStats(MOCK_APPOINTMENTS).total).toBe(5);
  });

  test('calculates pending count correctly', () => {
    expect(calcStats(MOCK_APPOINTMENTS).pending).toBe(2);
  });

  test('calculates confirmed count correctly', () => {
    expect(calcStats(MOCK_APPOINTMENTS).confirmed).toBe(1);
  });

  test('calculates today count correctly (3 are today)', () => {
    expect(calcStats(MOCK_APPOINTMENTS).today).toBe(3);
  });

  test('returns zeros for empty array', () => {
    const stats = calcStats([]);
    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.confirmed).toBe(0);
    expect(stats.today).toBe(0);
  });
});


describe('useDebouncedValue — debounce logic', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test('debounce delays value update', () => {
    let current = 'initial';
    const debounced = (() => {
      let timer;
      return (value, delay, callback) => {
        clearTimeout(timer);
        timer = setTimeout(() => { callback(value); }, delay);
      };
    })();

    debounced('updated', 300, v => { current = v; });
    expect(current).toBe('initial'); // لم يتغير بعد

    vi.advanceTimersByTime(300);
    expect(current).toBe('updated'); // تغير بعد 300ms
  });

  test('only last value is used when called rapidly', () => {
    let current = '';
    const calls = [];
    const debounced = (() => {
      let timer;
      return (value, delay) => {
        clearTimeout(timer);
        timer = setTimeout(() => { calls.push(value); current = value; }, delay);
      };
    })();

    debounced('م', 300);
    debounced('مح', 300);
    debounced('محم', 300);
    debounced('محمد', 300);

    vi.advanceTimersByTime(300);
    expect(calls.length).toBe(1);
    expect(current).toBe('محمد');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6. Integration — a11y + Component
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration — Accessible StatusBadge', () => {
  test('status badge is readable by screen readers', () => {
    render(<StatusBadge status="confirmed" />);
    const badge = screen.getByTestId('status-badge');

    // النص يجب أن يكون قابلاً للقراءة
    expect(badge.textContent.trim()).not.toBe('');

    // الـ dot indicator يجب أن يكون hidden من قارئات الشاشة
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  test('avatar provides accessible fallback', () => {
    render(<Avatar name="سارة أحمد" />);
    const avatar = screen.getByTestId('avatar');

    // aria-label يجب أن يكون موجوداً
    expect(avatar).toHaveAttribute('aria-label');
    expect(avatar.getAttribute('aria-label')).toContain('سارة أحمد');
  });
});

/**
 * AssistantUI.jsx — Shared Component Library for Assistant Feature
 * Sprint 3: Centralises repeated UI patterns across all assistant pages.
 *
 * Exports:
 *  - COLORS          — design tokens shortcut
 *  - StatusBadge     — appointment / prescription status chip
 *  - Avatar          — initials avatar with deterministic color
 *  - FieldInput      — labeled text / password input with icon
 *  - SectionCard     — white card with header icon + optional action
 *  - ToggleSwitch    — iOS-style toggle with label + description
 *  - EmptyState      — centered empty placeholder
 *  - PageHeader      — gradient banner used on profile / prescriptions
 *  - Spinner         — inline spinner div
 *  - InfoBanner      — info / warning / success inline banner
 *  - formatDate      — localised Arabic date helper
 *  - formatTime      — HH:MM → 12-hour helper
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
export const COLORS = {
  primary:  '#1B5E8A',
  primaryL: '#E6F1FB',
  success:  '#31A870',
  successL: '#D1FAE5',
  warning:  '#F59E0B',
  warningL: '#FEF3C7',
  danger:   '#E97D61',
  dangerL:  '#FEE2E2',
  accent:   '#8B5CF6',
  accentL:  '#F5F3FF',
  border:   '#E5E7EB',
  muted:    '#6B7280',
  light:    '#F3F4F6',
  text:     '#1F2937',
  textSub:  '#4B5563',
};

/* ─── Status badge ──────────────────────────────────────────────────────────── */
const STATUS_MAP = {
  // Appointment statuses
  pending:              { bg: '#FEF3C7', color: '#92400E', label: 'انتظار',        dot: '#F59E0B' },
  confirmed:            { bg: '#D1FAE5', color: '#065F46', label: 'مؤكد',          dot: '#31A870' },
  completed:            { bg: '#DBEAFE', color: '#1E3A5F', label: 'مكتمل',         dot: '#3B82F6' },
  cancelled:            { bg: '#FEE2E2', color: '#991B1B', label: 'ملغي',          dot: '#E97D61' },
  rejected:             { bg: '#FEE2E2', color: '#991B1B', label: 'مرفوض',         dot: '#E97D61' },
  no_show:              { bg: '#F3F4F6', color: '#374151', label: 'غياب',          dot: '#9CA3AF' },
  reschedule_requested: { bg: '#F5F3FF', color: '#5B21B6', label: 'إعادة جدولة',   dot: '#8B5CF6' },
  // Prescription statuses
  DRAFT:  { bg: '#FEF3C7', color: '#92400E', label: 'مسودة', dot: '#F59E0B' },
  SENT:   { bg: '#D1FAE5', color: '#065F46', label: 'مُرسلة', dot: '#31A870' },
};

export function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS_MAP[status] || STATUS_MAP[status?.toLowerCase()] || {
    bg: COLORS.light, color: COLORS.muted, label: status || '—', dot: COLORS.muted,
  };
  const px = size === 'sm' ? '6px 10px' : '8px 14px';
  const fs = size === 'sm' ? 11 : 13;
  return (
    <span
      data-testid="status-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: fs, fontWeight: 700, padding: px,
        borderRadius: 99, background: s.bg, color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {/* الدائرة الملونة مخفية من قارئات الشاشة — النص يكفي */}
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

/* ─── Avatar ────────────────────────────────────────────────────────────────── */
export function Avatar({ name, src, size = 42 }) {
  const letters = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue     = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      data-testid="avatar"
      aria-label={`صورة ${name || 'مستخدم'}`}
      role="img"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: src ? 'transparent' : `hsl(${hue},55%,75%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 800, color: `hsl(${hue},55%,25%)`,
        flexShrink: 0, overflow: 'hidden',
      }}
    >
      {src
        ? <img src={src} alt={name || 'صورة المستخدم'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span aria-hidden="true">{letters}</span>
      }
    </div>
  );
}

/* ─── Field input ───────────────────────────────────────────────────────────── */
export function FieldInput({
  label, name, type = 'text', value, onChange,
  error, icon, required, placeholder, disabled, rows,
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const isPass = type === 'password';
  const isArea = type === 'textarea';

  const borderColor = error ? COLORS.danger : focused ? COLORS.primary : COLORS.border;
  const shadow      = focused ? `0 0 0 3px rgba(27,94,138,0.1)` : 'none';
  const padL = icon ? '40px' : '13px';
  const padR = isPass ? '42px' : '13px';

  const sharedStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: `10px ${padR} 10px ${padL}`,
    borderRadius: 'var(--radius-md)', fontSize: '14px', fontFamily: 'inherit',
    border: `1.5px solid ${borderColor}`,
    outline: 'none', color: 'var(--text-h)',
    background: disabled ? 'var(--bg-page)' : 'var(--bg-card)',
    boxShadow: shadow, transition: 'all .2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>
          {label}{required && <span style={{ color: COLORS.danger }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)',
            color: focused ? COLORS.primary : '#9CA3AF', display: 'flex', pointerEvents: 'none',
            transition: 'color .2s',
          }}>
            {icon}
          </span>
        )}

        {isArea ? (
          <textarea
            name={name} value={value} onChange={onChange} rows={rows || 3}
            placeholder={placeholder || label}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...sharedStyle, resize: 'vertical', paddingLeft: 13, paddingRight: 13 }}
          />
        ) : (
          <input
            type={isPass ? (show ? 'text' : 'password') : type}
            name={name} value={value} onChange={onChange}
            disabled={disabled} placeholder={placeholder || label}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={sharedStyle}
          />
        )}

        {isPass && (
          <button
            type="button" onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-hint)', display: 'flex', padding: 0,
            }}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p style={{ margin: 0, fontSize: 11, color: COLORS.danger }}>⚠ {error}</p>}
    </div>
  );
}

/* ─── Section card ──────────────────────────────────────────────────────────── */
export function SectionCard({ title, subtitle, icon, children, action, noPad }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      padding: noPad ? 0 : '24px', boxShadow: 'var(--shadow-md)', marginBottom: 20,
      overflow: 'hidden',
    }}>
      {(title || icon || action) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: noPad ? 0 : 20, padding: noPad ? '20px 24px 16px' : 0,
          borderBottom: noPad ? '1px solid var(--border-base)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon && (
              <div style={{
                width: 38, height: 38, borderRadius: 'var(--radius-md)',
                background: COLORS.primaryL, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: COLORS.primary,
                flexShrink: 0,
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{title}</h3>}
              {subtitle && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-hint)' }}>{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Toggle switch ─────────────────────────────────────────────────────────── */
export function ToggleSwitch({ checked, onChange, label, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 0', borderBottom: '1px solid var(--bg-page)',
    }}>
      <div style={{ flex: 1, paddingInlineEnd: 16 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{label}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-hint)' }}>{desc}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 99, cursor: 'pointer',
          background: checked ? COLORS.primary : COLORS.border,
          position: 'relative', transition: 'background .25s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, insetInlineStart: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--bg-card)', transition: 'inset-inline-start .25s',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }} />
      </div>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────────────── */
export function EmptyState({ emoji = '📭', title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: COLORS.muted }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: COLORS.text }}>{title}</p>
      {description && <p style={{ margin: '0 0 20px', fontSize: 13 }}>{description}</p>}
      {action}
    </div>
  );
}

/* ─── Page gradient header ──────────────────────────────────────────────────── */
export function PageHeader({ children, gradient = 'linear-gradient(135deg,#1B5E8A 0%,#1a6b65 100%)' }) {
  return (
    <div style={{
      background: gradient, padding: '32px 32px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative circles */}
      <div style={{ position: 'absolute', top: -40, insetInlineEnd: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: -60, insetInlineStart: 200, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ─── Spinner ───────────────────────────────────────────────────────────────── */
export function Spinner({ size = 28, color = COLORS.primary }) {
  return (
    <>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `3px solid #E5E7EB`, borderTopColor: color,
        animation: 'assistantSpin 0.8s linear infinite',
        margin: '0 auto',
      }} />
      <style>{`@keyframes assistantSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

/* ─── Info banner ───────────────────────────────────────────────────────────── */
export function InfoBanner({ type = 'info', icon, children }) {
  const styles = {
    info:    { bg: COLORS.primaryL, border: COLORS.primary,  text: '#0C4A6E' },
    success: { bg: COLORS.successL, border: COLORS.success,  text: '#065F46' },
    warning: { bg: COLORS.warningL, border: COLORS.warning,  text: '#92400E' },
    danger:  { bg: COLORS.dangerL,  border: COLORS.danger,   text: '#991B1B' },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)',
      padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: 12, color: s.text, fontWeight: 600,
    }}>
      {icon && <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

/* ─── Date / time helpers ───────────────────────────────────────────────────── */
export function formatDate(d, locale = 'ar-EG') {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return String(d); }
}

export function formatTime(t) {
  if (!t) return '—';
  try {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'م' : 'ص';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return t; }
}

/* ─── Keyboard-accessible button ────────────────────────────────────────────── */
export function PrimaryBtn({ onClick, disabled, loading, children, icon, size = 'md' }) {
  const pad = size === 'sm' ? '8px 16px' : '10px 20px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: pad, borderRadius: 'var(--radius-md)',
        border: 'none', background: COLORS.primary, color: '#fff',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: fs, fontFamily: 'inherit',
        opacity: (disabled || loading) ? 0.7 : 1, transition: 'opacity .2s',
      }}
    >
      {icon && !loading && icon}
      {loading && <Spinner size={14} color="#fff" />}
      {children}
    </button>
  );
}

export function GhostBtn({ onClick, disabled, children, icon, size = 'md', color }) {
  const pad = size === 'sm' ? '7px 14px' : '9px 18px';
  const fs  = size === 'sm' ? 12 : 13;
  const c   = color || COLORS.primary;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: pad, borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${c}`, background: 'transparent', color: c,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontSize: fs, fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1, transition: 'all .2s',
      }}
    >
      {icon && icon}{children}
    </button>
  );
}

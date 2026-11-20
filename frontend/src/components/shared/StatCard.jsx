/**
 * StatCard.jsx — Design System v18
 * - الأرقام: font-family Plus Jakarta Sans (per proposal)
 * - icon background: color + opacity
 * - border-radius: 18px
 * - trend indicator (up/down/neutral)
 * - hover lift only if clickable
 */
import Skeleton from '../ui/Skeleton';
import { formatNumberLocale } from '../../utils/formatters';

const TREND_CONFIG = {
  up:      { color: '#1A8A5A', arrow: '↑' },
  down:    { color: '#E53E3E', arrow: '↓' },
  neutral: { color: 'var(--text-muted)', arrow: '→' },
};

export default function StatCard({
  label, value, icon, color = 'var(--primary)',
  loading = false, change, trend, onClick,
  subLabel, lang,
}) {
  if (loading) return <Skeleton.StatCard />;

  const trendCfg = TREND_CONFIG[trend] || null;
  const displayValue = (lang && typeof value === 'number')
    ? formatNumberLocale(value, lang)
    : (value ?? '—');

  /* Derive trend from change string if not explicit */
  const autoTrend = !trend && change
    ? (change.startsWith('+') ? 'up' : change.startsWith('-') ? 'down' : 'neutral')
    : null;
  const resolvedTrend = trendCfg || (autoTrend ? TREND_CONFIG[autoTrend] : null);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${label}: ${value}`}
      onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick(); } : undefined}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        border: '1px solid var(--border-base)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        outline: 'none',
        borderRight: `4px solid ${color}`,  /* RTL: border on right */
      }}
      onMouseOver={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'none';
      }}
      onFocus={e => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.borderRightColor = color;
      }}
    >
      {/* Icon */}
      <div
        aria-hidden="true"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-lg)',
          background: color + '18',   /* color + 10% opacity */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Value — Plus Jakarta Sans for numbers */}
        <p style={{
          fontSize: '30px',
          fontWeight: 800,
          color,
          margin: '0 0 2px',
          lineHeight: 1,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '-0.02em',
        }}>
          {displayValue}
        </p>

        {/* Label */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          margin: 0,
          fontWeight: 500,
          fontFamily: "'Cairo', sans-serif",
          lineHeight: 1.4,
        }}>
          {label}
        </p>

        {/* Sub-label */}
        {subLabel && (
          <p style={{
            fontSize: '11px',
            color: 'var(--text-hint)',
            margin: '2px 0 0',
            fontFamily: "'Cairo', sans-serif",
          }}>
            {subLabel}
          </p>
        )}

        {/* Change / Trend */}
        {change && (
          <p style={{
            fontSize: '12px',
            color: resolvedTrend?.color || 'var(--text-muted)',
            margin: '5px 0 0',
            fontWeight: 600,
            fontFamily: "'Cairo', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            {resolvedTrend && (
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {resolvedTrend.arrow}
              </span>
            )}
            {change}
          </p>
        )}
      </div>
    </div>
  );
}

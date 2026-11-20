import { tokens } from '../../theme/tokens';
import useTranslation from '../../i18n/useTranslation';

/**
 * Badge — locale-aware appointment status badge
 * Uses useTranslation for label if available, falls back to tokens.status.label
 */
export function Badge({ status, label, size = 'sm', lang: langProp }) {
  const { t, lang: hookLang } = useTranslation();
  const lang = langProp || hookLang;

  const STATUS_CONFIG = tokens?.colors?.status || {};
  const key = status?.toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.pending || { bg: '#eee', text: '#333', dot: '#999', label: status };
  const padding = size === 'sm' ? '2px 10px' : '4px 14px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  // Prefer i18n translation if key exists, otherwise fall back to tokens label
  const translatedLabel = label
    || (key ? t(`appointments.status.${key}`) : null)
    || config.label;

  return (
    <span
      role="status"
      aria-label={`Status: ${translatedLabel}`}
      style={{
        background: config.bg, color: config.text,
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding, borderRadius: 'var(--radius-pill)', fontSize, fontWeight: 600,
        whiteSpace: 'nowrap', letterSpacing: '0.01em',
      }}
    >
      <span aria-hidden="true" style={{
        width: size === 'sm' ? '5px' : '6px',
        height: size === 'sm' ? '5px' : '6px',
        borderRadius: '50%', background: config.dot, flexShrink: 0,
      }} />
      {translatedLabel}
    </span>
  );
}

export function TagBadge({ children, color = 'var(--primary)' }) {
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}30`,
      borderRadius: 'var(--radius-pill)', padding: '2px 10px', fontSize: '11px', fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

export default Badge;

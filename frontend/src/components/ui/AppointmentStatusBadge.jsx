/**
 * components/ui/AppointmentStatusBadge.jsx
 *
 * Appointment-specific status badge with icons and colors.
 * Extends the generic Badge component for appointment flows.
 *
 * Statuses: pending | confirmed | cancelled | completed | rejected | no_show
 */
import { useTranslation } from '../../i18n/useTranslation';

const STATUS_CONFIG = {
  pending:   { label: 'status.pending',   fallback: 'Pending',   ar: 'قيد الانتظار', icon: '⏳', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  confirmed: { label: 'status.confirmed', fallback: 'Confirmed', ar: 'مؤكد', icon: '✅', bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' },
  cancelled: { label: 'status.cancelled', fallback: 'Cancelled', ar: 'ملغي', icon: '✕',  bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
  completed: { label: 'status.completed', fallback: 'Completed', ar: 'مكتمل', icon: '🏁', bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' },
  rejected:  { label: 'status.rejected',  fallback: 'Rejected',  ar: 'مرفوض', icon: '🚫', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  no_show:   { label: 'status.noShow',    fallback: 'No Show',   ar: 'لم يحضر', icon: '👻', bg: '#FEF3C7', color: '#E67E22', border: '#E67E22' },
  reschedule_requested: { label: 'status.reschedule', fallback: 'Reschedule', ar: 'طلب إعادة جدولة', icon: '🔄', bg: '#F5F3FF', color: '#7C3AED', border: '#C4B5FD' },
};

const DEFAULT_CONFIG = { label: '—', icon: '•', bg: 'var(--border-base)', color: 'var(--text-muted)', border: 'var(--border)' };

/**
 * @param {string} status  — appointment status string
 * @param {string} [size]  — 'sm' | 'md' (default: 'sm')
 * @param {boolean} [showIcon]
 */
export function AppointmentStatusBadge({ status = '', size = 'sm', showIcon = true }) {
  const { t, language } = useTranslation();
  const isRTL  = language === 'ar';
  const key    = status?.toLowerCase?.() || '';
  const config = STATUS_CONFIG[key] || DEFAULT_CONFIG;

  const padding    = size === 'sm' ? '3px 10px' : '5px 14px';
  const fontSize   = size === 'sm' ? '11px' : '13px';

  // Resolve label based on translation or fallback
  const label = config.label ? t(config.label, isRTL ? config.ar : config.fallback) : config.label;

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '5px',
      padding,
      borderRadius: 'var(--radius-full)',
      fontSize,
      fontWeight:    600,
      background:    config.bg,
      color:         config.color,
      border:        `1.5px solid ${config.border}`,
      whiteSpace:    'nowrap',
      letterSpacing: '0.02em',
    }}>
      {showIcon && <span style={{ fontSize: size === 'sm' ? '10px' : '12px' }}>{config.icon}</span>}
      {label}
    </span>
  );
}

export default AppointmentStatusBadge;

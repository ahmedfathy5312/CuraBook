/**
 * AppointmentCard.jsx — Design System v18
 * Rule: الـ 3 actions موجودة في الـ card — المريض مش محتاج يدخل الـ details page
 * Status badge with proper colors per design tokens
 */
import { useNavigate } from 'react-router-dom';
import { formatArDate, formatArTime, timeUntil } from '../utils/dateUtils';
import { useTranslation } from '../i18n/useTranslation';
import { getLocalizedName } from '../utils/getLocalizedName';

const STATUS_CONFIG = {
  confirmed:  { bg: 'var(--success-light)', color: 'var(--success-dark)', dot: 'var(--success)', label: 'مؤكد'          },
  pending:    { bg: 'var(--warning-light)', color: 'var(--warning-dark)', dot: 'var(--gold)',    label: 'قيد الانتظار'  },
  cancelled:  { bg: 'var(--danger-light)',  color: 'var(--danger-dark)',  dot: 'var(--danger)',  label: 'ملغي'          },
  rejected:   { bg: 'var(--danger-light)',  color: 'var(--danger-dark)',  dot: 'var(--danger)',  label: 'مرفوض'         },
  completed:  { bg: 'var(--primary-pale)',  color: 'var(--primary-dark)', dot: 'var(--primary)', label: 'مكتمل'         },
  no_show:    { bg: 'var(--warning-light)', color: 'var(--warning-dark)', dot: 'var(--gold)',    label: 'لم يحضر'       },
  reschedule_requested: { bg: 'var(--primary-pale)', color: 'var(--primary-dark)', dot: 'var(--primary)', label: 'طلب تأجيل' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: cfg.bg,
      color: cfg.color,
      fontSize: '12px',
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: "'Cairo', sans-serif",
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: cfg.dot, flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}

function ActionBtn({ onClick, color = 'var(--primary)', bg = 'var(--primary-pale)', label, disabled = false }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      style={{
        background: bg,
        color: color,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        padding: '7px 14px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Cairo', sans-serif",
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
      onMouseOut={e => { e.currentTarget.style.opacity = disabled ? '0.5' : '1'; }}
    >
      {label}
    </button>
  );
}

export default function AppointmentCard({
  appointment,
  clickable = true,
  onJoin,
  onReschedule,
  onCancel,
  showActions = true,
}) {
  const navigate  = useNavigate();
  const { lang }  = useTranslation();
  const rawStatus = (appointment.status || 'pending').toLowerCase();
  const rawDate   = appointment.slot_start || appointment.date;
  const specialty = appointment.doctor_specialty || appointment.specialty || appointment.doctor?.specialty || '';
  // FIX v31 — Issue #6: include full_name_en so getLocalizedName() returns English name in EN mode
  const doctorObj = appointment.doctor || {
    full_name:    appointment.doctorName    || appointment.doctor_name    || '',
    full_name_en: appointment.doctorNameEn  || appointment.doctor_name_en || '',
  };
  const doctorName = getLocalizedName(doctorObj, lang, 'doctor') || appointment.doctorName || appointment.doctor_name || 'الدكتور';
  const visitType = appointment.visit_type || appointment.appointment_type || '';
  const isOnline  = visitType === 'ONLINE' || visitType === 'online';
  const isConfirmed = rawStatus === 'confirmed';
  const isPending   = rawStatus === 'pending';
  const isCancellable = ['pending', 'confirmed'].includes(rawStatus);

  const handleCardClick = () => {
    if (clickable) navigate(`/appointments/${appointment.id}`);
  };

  // Time until appointment
  const upcoming = rawDate ? timeUntil(rawDate) : null;

  return (
    <div
      onClick={handleCardClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={e => { if (clickable && e.key === 'Enter') handleCardClick(); }}
      aria-label={`موعد مع ${doctorName}`}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-base)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* ── Colored top strip based on status */}
      <div style={{
        height: '3px',
        background: STATUS_CONFIG[rawStatus]?.dot || 'var(--gold)',
      }} />

      <div style={{ padding: '18px 20px' }}>
        {/* ── Header: title + date + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '3px', fontFamily: "'Cairo', sans-serif" }}>
              {upcoming || 'موعد طبي'}
            </p>
            {rawDate && (
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', fontFamily: "'Cairo', sans-serif" }}>
                {formatArDate(rawDate)} · {formatArTime(rawDate)}
              </p>
            )}
          </div>
          <StatusBadge status={rawStatus} />
        </div>

        {/* ── Doctor Info */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
          {/* Avatar: 16px border-radius — consistent with card system */}
          <div style={{
            width: '52px', height: '52px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--primary-pale)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', flexShrink: 0, overflow: 'hidden',
          }}>
            {appointment.doctorImage ? (
              <img src={appointment.doctorImage} alt={doctorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : '👨‍⚕️'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', fontFamily: "'Cairo', sans-serif" }}>
              {doctorName}
            </p>
            {specialty && (
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                {specialty}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isOnline && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
                  🌐 أونلاين
                </span>
              )}
              {!isOnline && (appointment.clinic_name || appointment.hospital_name) && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
                  📍 {appointment.clinic_name || appointment.hospital_name}
                </span>
              )}
              {appointment.duration && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
                  ⏱ {appointment.duration} د
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Inline Actions — no need to enter details page */}
        {showActions && (
          <div
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Join Video — only for confirmed online */}
            {isConfirmed && isOnline && onJoin && (
              <ActionBtn
                onClick={onJoin}
                bg='var(--primary)'
                color="#fff"
                label="🎥 انضم للاستشارة"
              />
            )}

            {/* Reschedule */}
            {isCancellable && onReschedule && (
              <ActionBtn
                onClick={onReschedule}
                bg="#EAF4FB"
                color='var(--primary)'
                label="📅 تأجيل"
              />
            )}

            {/* Cancel */}
            {isCancellable && onCancel && (
              <ActionBtn
                onClick={onCancel}
                bg="var(--danger-light)"
                color="var(--danger-dark)"
                label="إلغاء"
              />
            )}

            {/* View details */}
            {clickable && (
              <ActionBtn
                onClick={() => navigate(`/appointments/${appointment.id}`)}
                bg="var(--bg)"
                color='var(--text-body)'
                label="التفاصيل ←"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

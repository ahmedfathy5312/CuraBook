/**
 * NextAppointmentHero.jsx — i18n FIXED (Sprint 3)
 * All strings via useTranslation — bilingual AR/EN
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Skeleton from '../../../components/ui/Skeleton';
import { formatDate, formatTime } from '../../../utils/formatters';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PRIMARY_DARK = tokens?.colors?.primary?.dark    || '#0C6478';

export default function NextAppointmentHero({ appointment, loading, navigate }) {
  const { t } = useTranslation();

  if (loading) return (
    <div style={{ marginBottom: '24px' }}>
      <Skeleton height={140} borderRadius={16} />
    </div>
  );

  if (!appointment) return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px 24px',
      textAlign: 'center', marginBottom: '24px',
      border: '1px solid var(--border-base)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗓</div>
      <p style={{ margin: '0 0 12px', fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>
        {t('nextAppointment.noAppointment')}
      </p>
      <Link to="/doctors">
        <button style={{
          background: PRIMARY, color: '#fff', border: 'none',
          borderRadius: 'var(--radius-md)', padding: '10px 24px', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer', fontFamily: "inherit",
        }}>
          {t('nextAppointment.bookNow')}
        </button>
      </Link>
    </div>
  );

  // Strip any existing prefix (د. / Dr.) before we add the locale-aware one to avoid "د. د. داليا"
  const rawDoctorName = appointment.doctor_name || appointment.doctor || '';
  const doctorName = rawDoctorName.replace(/^(د\.\s*|Dr\.\s*)/i, '').trim() || t('common.doctorPrefix');
  // FIX: backend returns slot_start (ISO datetime) — use it as primary date/time source
  const date       = appointment.slot_start || appointment.date || appointment.slot?.date || '';
  const time       = appointment.slot_start || appointment.time || appointment.slot?.start_time || appointment.slot_time || '';
  const location   = appointment.clinic_name || appointment.hospital_name || appointment.location_type || '';
  const fee        = appointment.fee || appointment.consultation_fee;

  let daysLabel = '';
  if (date) {
    // For ISO datetimes (slot_start), strip time part for day-diff calculation
    const dateOnly = date.slice(0, 10);
    const diff = Math.ceil((new Date(dateOnly) - new Date(new Date().toISOString().slice(0, 10))) / (1000 * 60 * 60 * 24));
    if (diff === 0) daysLabel = t('nextAppointment.today');
    else if (diff === 1) daysLabel = t('nextAppointment.tomorrow');
    else if (diff > 1) daysLabel = t('nextAppointment.inDays', { count: diff });
  }

  const prefix = t('common.doctorPrefix');

  return (
    <div style={{
      background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
      borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: '24px',
      color: '#fff', position: 'relative', overflow: 'hidden',
      boxShadow: `0 8px 24px ${PRIMARY}40`,
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: -20, left: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '12px', opacity: 0.8 }}>{t('nextAppointment.title')}</p>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>
              {prefix} {doctorName}
            </h3>
            <p style={{ margin: '0 0 4px', fontSize: '13px', opacity: 0.9 }}>
              {formatDate(date)} · {formatTime(time)}
            </p>
            {location && <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>📍 {location}</p>}
            {fee && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.8 }}>
                💰 {fee} {t('nextAppointment.feeUnit')}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {daysLabel && (
              <span style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-xl)',
                padding: '4px 14px', fontSize: '12px', fontWeight: 700,
              }}>
                {daysLabel}
              </span>
            )}
            <Link to={`/appointments/${appointment.public_id || appointment.id}`} style={{ display: 'block', marginTop: '10px' }}>
              <button style={{
                background: 'var(--bg-card)', color: PRIMARY, border: 'none',
                borderRadius: 'var(--radius-md)', padding: '8px 18px', fontSize: '12px',
                fontWeight: 700, cursor: 'pointer', fontFamily: "inherit",
              }}>
                {t('nextAppointment.viewDetails')}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

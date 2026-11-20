import { useState } from 'react';
import { useMyAppointments, useCancelAppointment, useRescheduleAppointment } from '../hooks/useMyAppointments';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Tabs } from '../../../components/ui/Tabs';
import Avatar from '../../../components/ui/Avatar';
import { formatDate, formatTime, getDoctorPrefix } from '../../../utils/formatters';
import { Modal } from '../../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../../../i18n/useTranslation';
import { useAppointmentSocket } from '../../../hooks/useAppointmentSocket';

function AppointmentCard({ appointment, onCancel, onReschedule }) {
  const { t, lang } = useTranslation();
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const cancelMutation = onCancel;
  const rescheduleMutation = onReschedule;
  const navigate = useNavigate();

  // FIX BUG-05: backend returns slot_start/slot_end (ISO datetimes), not .date / .time
  const displayDate = formatDate(appointment.slot_start || appointment.date);
  const displayTime = formatTime(appointment.slot_start || appointment.time);

  // FIX M-01: specialty may come as doctor_specialty or nested doctor.specialty
  const specialty = appointment.doctor_specialty
    || appointment.specialty
    || appointment.doctor?.specialty
    || '';

  // FIX Issue#19: strip existing prefix to prevent doubling (e.g. 'د. د. أميرة')
  const rawDoctorName = appointment.doctor_name || appointment.doctor?.name || '—';
  const doctorName = rawDoctorName.replace(/^(د\.\s*|Dr\.\s*)/i, '').trim();
  const doctorLabel = `${getDoctorPrefix(lang)} ${doctorName}`;

  // FIX BUG-03: backend stores UPPERCASE — normalize to lowercase for comparisons
  // STATUS-MAPPING FIX: include 'reschedule_requested' alongside 'confirmed' —
  // patient can still cancel a reschedule-requested appointment, but cannot
  // request another reschedule while one is already pending.
  const statusLower   = appointment.status?.toLowerCase();
  const canCancel     = ['pending', 'confirmed', 'reschedule_requested'].includes(statusLower);
  const canReschedule = statusLower === 'confirmed'; // only pure CONFIRMED, not RESCHEDULE_REQUESTED

  return (
    <>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', gap: '16px', alignItems: 'flex-start',
        opacity: appointment._optimistic ? 0.7 : 1,
        transition: 'opacity 0.3s',
      }}>
        <Avatar name={doctorName} size="lg" src={appointment.doctor_image} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 2px' }}>
                {doctorLabel}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
                {specialty}
              </p>
            </div>
            <Badge status={appointment.status} lang={lang} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📅 {displayDate}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              ⏰ {displayTime}
            </span>
            {appointment.type && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                🏥 {appointment.type}
              </span>
            )}
          </div>
          {appointment._optimistic && (
            <p style={{ fontSize: '12px', color: '#F59E0B', fontStyle: 'italic' }}>⏳ {t('appointments.saving') || t('common.saving')}</p>
          )}
          {(canCancel || canReschedule) && !appointment._optimistic && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canReschedule && (
                <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
                  🔄 {t('appointments.reschedule')}
                </Button>
              )}
              {canCancel && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
                  {t('appointments.cancelAppt')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('appointments.cancelTitle')}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" size="sm"
              loading={cancelMutation?.isPending}
              onClick={() => { cancelMutation?.mutate(appointment.id); setConfirmOpen(false); }}>
              {t('appointments.cancelBtn')}
            </Button>
          </>
        }>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('appointments.cancelConfirm', { doctor: doctorLabel, date: displayDate })}
        </p>
      </Modal>

      {/* Reschedule request modal */}
      <Modal open={rescheduleOpen} onClose={() => { setRescheduleOpen(false); setRescheduleReason(''); }} title={t('appointments.rescheduleTitle')}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setRescheduleOpen(false); setRescheduleReason(''); }}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm"
              disabled={!rescheduleReason.trim() || rescheduleMutation?.isPending}
              loading={rescheduleMutation?.isPending}
              onClick={() => {
                rescheduleMutation?.mutate(
                  { id: appointment.id, reason: rescheduleReason },
                  {
                    onSuccess: () => { setRescheduleOpen(false); setRescheduleReason(''); },
                  }
                );
              }}>
              {t('appointments.rescheduleBtn')}
            </Button>
          </>
        }>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('appointments.reschedule')} — {doctorLabel}
        </p>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>
          {t('appointments.rescheduleReason')} <span style={{ color: '#D93025' }}>*</span>
        </label>
        <textarea
          value={rescheduleReason}
          onChange={e => setRescheduleReason(e.target.value)}
          placeholder={lang === 'ar' ? t('patientDashboard.rescheduleReasonPh') : 'e.g. Work conflict, feeling better...'}
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-base)', fontSize: '13px', color: 'var(--text-h)',
            // BUG-FIX #3: explicit background so textarea is visible in all themes (dark/light)
            background: 'var(--bg-input, var(--bg-card, #fff))',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {/* Show inline API error if reschedule request fails */}
        {rescheduleMutation?.isError && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#E97D61', fontWeight: 600 }}>
            ⚠ {lang === 'ar' ? 'فشل إرسال الطلب. يرجى المحاولة مجدداً.' : 'Request failed. Please try again.'}
          </p>
        )}
      </Modal>
    </>
  );
}

export default function AppointmentsPage() {
  const { t, lang } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useAppointmentSocket({ role: 'patient' });

  const STATUS_TABS = [
    { id: 'all',       label: t('appointments.status.all') },
    { id: 'pending',   label: t('appointments.status.pending') },
    { id: 'confirmed', label: t('appointments.status.confirmed') },
    { id: 'completed', label: t('appointments.status.completed') },
    { id: 'cancelled', label: t('appointments.status.cancelled') },
  ];

  // STATUS-MAPPING FIX (v34):
  // "confirmed" tab uses backend status_in=CONFIRMED,RESCHEDULE_REQUESTED
  // so the server returns both statuses in one request — no client-side filtering needed.
  const buildParams = (filter) => {
    if (filter === 'all')       return {};
    if (filter === 'confirmed') return { status_in: 'CONFIRMED,RESCHEDULE_REQUESTED' };
    return { status: filter.toUpperCase() };
  };

  const params = buildParams(statusFilter);
  const { data, isLoading, isError } = useMyAppointments(params);
  const cancelMutation    = useCancelAppointment();
  const rescheduleMutation = useRescheduleAppointment();

  const rawAppointments = data?.results || data || [];

  // No client-side filtering needed — backend handles status_in correctly.
  const appointments = rawAppointments;

  // EMPTY STATE FIX: derive all display strings up-front so they are
  // guaranteed Arabic (from our ar.js keys) — never fall through to any
  // English hardcoded string from EmptyState preset defaults.
  const currentTabLabel = STATUS_TABS.find(s => s.id === statusFilter)?.label || '';
  const emptyTitle = statusFilter !== 'all'
    ? `${t('appointments.noAppointments')} — ${currentTabLabel}`
    : t('emptyState.appointmentsTitle') || 'لا توجد مواعيد قادمة';

  const emptyMsg = statusFilter !== 'all'
    ? null   // no booking instruction for filtered views
    : t('emptyState.appointmentsMsg') || 'عند حجز موعد، سيظهر هنا مع التعليمات.';

  return (
    <>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
            {t('appointments.myAppointments')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-hint)', margin: 0 }}>
            {appointments.length} {t('appointments.title').toLowerCase()}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/doctors')}>
          + {t('appointments.bookNew')}
        </Button>
      </div>

      <Tabs tabs={STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)
        ) : isError ? (
          <EmptyState preset="error" />
        ) : !appointments.length ? (
          /* EMPTY STATE: self-contained Arabic rendering — does NOT rely on
             EmptyState preset defaults (which can fall back to English strings).
             Only the "all" tab gets the "Find a Doctor" button. Filtered tabs
             show a simple "لا توجد مواعيد — مؤكد" message with no action. */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
            padding: '64px 32px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--primary-lighter)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', marginBottom: '16px',
            }}>📅</div>

            <h3 style={{
              fontSize: '17px', fontWeight: 700, color: 'var(--text-h)',
              marginBottom: '8px', fontFamily: "'Cairo', sans-serif",
            }}>
              {emptyTitle}
            </h3>

            {emptyMsg && (
              <p style={{
                fontSize: '14px', color: 'var(--text-muted)',
                maxWidth: '300px', lineHeight: 1.8,
                fontFamily: "'Cairo', sans-serif", margin: 0,
              }}>
                {emptyMsg}
              </p>
            )}

            {/* "Find a Doctor" button ONLY on the "all" tab */}
            {statusFilter === 'all' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/doctors')}
                style={{ marginTop: '24px' }}
              >
                {t('doctors.searchDoctors')}
              </Button>
            )}
          </div>
        ) : (
          appointments.map(a => (
            <AppointmentCard key={a.id} appointment={a} onCancel={cancelMutation} onReschedule={rescheduleMutation} />
          ))
        )}
      </div>
      </div>
    </>
  );
}

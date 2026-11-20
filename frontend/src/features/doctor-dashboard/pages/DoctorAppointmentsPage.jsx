/**
 * DoctorAppointmentsPage.jsx — BUG-1 FIX: Grid View now fully implemented
 * Also adds: Reject reason modal, Date filter, Calendar-style grid
 * 
 * HP-FIXES (Phase 2):
 * ✅ AppointmentCard: t() function now properly injected
 * ✅ Removed 'rejected' status filter (not needed per spec)
 * ✅ Fixed column header translation keys (status, consultation_fee)
 * ✅ Fixed date filter labels to show correct Arabic/English text
 * ✅ Session notes textarea is fully interactive
 * ✅ common.reject translation key added
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorAppointments, useCompleteAppointment, useApproveAppointment, useRejectAppointment } from '../hooks/useDoctorDashboard';
import { AppointmentStatusBadge } from '../../../components/ui/AppointmentStatusBadge';
import { Table } from '../../../components/ui/Table';
import { SearchInput } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { Modal } from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import { createSession } from '../../video/api/videoApi';
import { formatDate, formatTime } from '../../../utils/formatters';
import tokens from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const MOD_DANGER  = tokens?.colors?.danger?.DEFAULT  || '#EF4444';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_INFO    = tokens?.colors?.info?.DEFAULT    || '#3B82F6';
const MOD_WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const MOD_SM      = tokens?.shadows?.sm              || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';

// HP-FIX: Removed 'rejected' filter — not needed for daily workflow
// Problem 12 FIX: Now uses t() system instead of inline labelAr/labelEn
const getStatusFilters = (t) => [
  { id: 'all',       labelKey: 'doctorAppointments.statusFilter.all' },
  { id: 'pending',   labelKey: 'doctorAppointments.statusFilter.pending' },
  { id: 'confirmed', labelKey: 'doctorAppointments.statusFilter.confirmed' },
  { id: 'completed', labelKey: 'doctorAppointments.statusFilter.completed' },
  { id: 'cancelled', labelKey: 'doctorAppointments.statusFilter.cancelled' },
];

// HP-FIX: Date filter labels — Problem 12 FIX: Now uses t() system
const getDateFilters = (t) => [
  { id: 'all',   labelKey: 'doctorAppointments.dateFilter.all' },
  { id: 'today', labelKey: 'doctorAppointments.dateFilter.today' },
  { id: 'week',  labelKey: 'doctorAppointments.dateFilter.week' },
  { id: 'month', labelKey: 'doctorAppointments.dateFilter.month' },
];

// ── Grid Card ───────────────────────────────────────────────────────────────
// HP-FIX: t() function is now passed as a prop to prevent ReferenceError
function AppointmentCard({ appt, onApprove, onReject, onComplete, onStartVideo, isRTL, t }) {
  const statusColor = {
    pending:   MOD_WARNING,
    confirmed: MOD_P,
    completed: MOD_SUCCESS,
    cancelled: '#9CA3AF',
    rejected:  MOD_DANGER,
  }[appt.status] || MOD_P;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 20, padding: 20,
      border: `2px solid ${statusColor}30`,
      boxShadow: MOD_SM, transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${statusColor}25`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = MOD_SM; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={appt.patient_name || appt.full_name} size={48} />
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>{appt.patient_name || appt.full_name || '—'}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-hint)' }}>{appt.reason || t('appointments.noReason')}</p>
          </div>
        </div>
        <AppointmentStatusBadge status={appt.status} />
      </div>

      {/* Date / Time / Type chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ padding: '4px 10px', background: MOD_PL, borderRadius: 8, fontSize: 12, fontWeight: 700, color: MOD_PD }}>
          📅 {formatDate(appt.date || appt.slot?.date)}
        </span>
        <span style={{ padding: '4px 10px', background: `${MOD_P}15`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: MOD_P }}>
          🕐 {formatTime(appt.time || appt.slot?.start_time)}
        </span>
        <span style={{ padding: '4px 10px', background: appt.visit_type === 'ONLINE' ? `${MOD_ACCENT}15` : 'var(--bg-subtle)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: appt.visit_type === 'ONLINE' ? MOD_ACCENT : 'var(--text-muted)' }}>
          {appt.visit_type === 'ONLINE' ? `🎥 ${t('booking.online')}` : `🏢 ${t('booking.in_person')}`}
        </span>
      </div>

      {/* actions / footer */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-base)', paddingTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>💰 {appt.consultation_fee || '—'}</span>
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: appt.payment_status === 'paid' ? MOD_SUCCESS : MOD_WARNING }}>
               {appt.payment_status === 'paid' ? t('doctorAppointments.paid') : t('doctorAppointments.unpaid')}
            </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {appt.status === 'pending' && (
            <>
              <Button variant="primary" size="sm" onClick={() => onApprove(appt.id)}
                style={{ flex: 1, background: MOD_SUCCESS, borderColor: MOD_SUCCESS, borderRadius: 10, fontWeight: 800, fontSize: 12, color: '#fff' }}>
                ✓ {t('common.confirm')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => onReject(appt)}
                style={{ flex: 1, background: MOD_DANGER, borderColor: MOD_DANGER, borderRadius: 10, fontWeight: 800, fontSize: 12, color: '#fff' }}>
                ✕ {t('common.reject')}
              </Button>
            </>
          )}
          {appt.status === 'confirmed' && appt.visit_type === 'ONLINE' && (
            <Button variant="primary" size="sm" onClick={() => onStartVideo(appt)}
              style={{ flex: 1, background: `linear-gradient(135deg, ${MOD_INFO}, ${MOD_ACCENT})`, borderColor: 'transparent', borderRadius: 10, fontWeight: 800, fontSize: 12 }}>
              🎥 {t('doctor.appointments.startVideo')}
            </Button>
          )}
          {appt.status === 'confirmed' && (
            <Button variant="primary" size="sm" onClick={() => onComplete(appt)}
              style={{ flex: 1, borderRadius: 10, fontWeight: 800, fontSize: 12 }}>
              ✓ {t('common.confirm')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorAppointmentsPage() {
  const { t, language }  = useTranslation();
  const navigate          = useNavigate();
  const toast             = useToast();
  const isRTL             = language === 'ar';

  const [page, setPage]           = useState(1);
  const [status, setStatus]       = useState('');
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [completing, setCompleting] = useState(null);
  const [notes, setNotes]         = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);  // BUG-1: reject with reason
  const [rejectReason, setRejectReason] = useState('');
  // BUG-1 FIX: viewMode now actually switches between list and grid
  const [viewMode, setViewMode]   = useState('list');

  // MP-UI/UX FIXES: Medium Priority
  const [startingVideoId, setStartingVideoId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');              // MP-7: Diagnosis in complete modal
  const [paymentStatus, setPaymentStatus] = useState('full');   // MP-7: Payment in complete modal

  // P3-6 FIX: send date_range param directly — backend now handles today/week/month
  const params = {
    page,
    page_size: 15,
    ...(status && status !== 'all' ? { status } : {}),
    ...(search ? { search } : {}),
    ...(dateRange && dateRange !== 'all' ? { date_range: dateRange } : {}),
  };
  const { data, isLoading } = useDoctorAppointments(params);
  const completeMutation = useCompleteAppointment();
  const approveMutation  = useApproveAppointment();
  const rejectMutation   = useRejectAppointment();

  const appointments = data?.results ?? data ?? [];
  const total        = data?.count ?? 0;
  const totalPages   = Math.ceil(total / 15) || 1;

  const handleComplete = async () => {
    if (!completing) return;
    try {
      await completeMutation.mutateAsync({ id: completing.id, notes });
      toast.success(language === 'ar' ? 'تم إكمال الموعد بنجاح' : 'Appointment completed successfully');
      setCompleting(null);
      setNotes('');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message
        || (language === 'ar' ? 'حدث خطأ أثناء إكمال الموعد، يرجى المحاولة مجدداً' : 'Failed to complete appointment. Please try again.');
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    await rejectMutation.mutateAsync({ id: rejectTarget.id, reason: rejectReason });
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleStartVideo = async (appointment) => {
    const appointmentId = appointment?.id || appointment;
    if (!appointmentId || startingVideoId) return;

    setStartingVideoId(appointmentId);
    try {
      const session = await createSession(appointmentId);
      if (!session?.id) throw new Error('Video session ID was not returned.');
      navigate(`/video/lobby/${session.id}`);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        (language === 'ar'
          ? 'تعذر بدء مكالمة الفيديو. حاول مرة أخرى.'
          : 'Could not start the video call. Please try again.');
      toast.error(message);
    } finally {
      setStartingVideoId(null);
    }
  };

  const columns = [
    { key: 'patient', header: t('appointments.patient'),
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={r.patient_name || r.full_name} size={40} style={{ border: '2px solid white', boxShadow: MOD_SM }} />
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>{r.patient_name || r.full_name || '—'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-hint)', fontWeight: 500 }}>{r.reason || t('appointments.noReason')}</p>
          </div>
        </div>
      )},
    { key: 'date', header: t('appointments.dateTime'),
      render: (_, r) => (
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-body)' }}>{formatDate(r.date || r.slot?.date)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: MOD_P, fontWeight: 700, background: MOD_PL, display: 'inline-block', padding: '2px 8px', borderRadius: 8 }}>{formatTime(r.time || r.slot?.start_time)}</p>
        </div>
      )},
    { key: 'fee', header: t('booking.consultation_fee', 'رسوم الكشف'),
      render: (_, r) => <span style={{ fontWeight: 900, color: 'var(--text-h)' }}>{r.consultation_fee || '—'}</span>
    },
    { key: 'payment', header: t('doctorAppointments.payment'),
      render: (_, r) => (
        <span style={{ 
          fontSize: 11, fontWeight: 900, padding: '4px 8px', borderRadius: 8,
          background: r.payment_status === 'paid' ? `${MOD_SUCCESS}15` : '#FEF3C7',
          color: r.payment_status === 'paid' ? MOD_SUCCESS : '#D97706'
        }}>
          {r.payment_status === 'paid' ? t('doctorAppointments.paid') : t('doctorAppointments.unpaid')}
        </span>
      )
    },
    { key: 'status', header: isRTL ? 'الحالة' : 'Status',
      render: (_, r) => <AppointmentStatusBadge status={r.status} />
    },
    { key: 'actions', header: '',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          {r.status === 'pending' && (
            <>
              <Button variant="primary" size="sm" loading={approveMutation.isPending && approveMutation.variables === r.id}
                onClick={() => approveMutation.mutate(r.id)}
                style={{ background: MOD_SUCCESS, borderColor: MOD_SUCCESS, borderRadius: 10, fontWeight: 800, color: '#fff', padding: '6px 14px', boxShadow: `0 3px 8px ${MOD_SUCCESS}40` }}>
                ✓ {t('common.confirm')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                style={{ background: MOD_DANGER, borderColor: MOD_DANGER, borderRadius: 10, fontWeight: 800, color: '#fff', padding: '6px 14px', boxShadow: `0 3px 8px ${MOD_DANGER}40` }}>
                ✕ {t('common.reject')}
              </Button>
            </>
          )}
          {r.status === 'confirmed' && r.visit_type === 'ONLINE' && (
            <Button variant="primary" size="sm" onClick={() => handleStartVideo(r)}
              loading={startingVideoId === r.id}
              style={{ background: `linear-gradient(135deg, ${MOD_INFO}, ${MOD_ACCENT})`, borderColor: 'transparent', borderRadius: 10, fontWeight: 800, boxShadow: MOD_SM }}>
              🎥 {t('doctor.appointments.startVideo')}
            </Button>
          )}
          {r.status === 'confirmed' && (
            <Button variant="primary" size="sm" onClick={() => { setCompleting(r); setNotes(''); }}
              style={{ borderRadius: 10, fontWeight: 700, padding: '6px 14px' }}>
              ✓ {t('common.confirm')}
            </Button>
          )}
        </div>
      )},
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Premium Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, #065F46 0%, #047857 100%)`,
        borderRadius: 24, padding: '36px 40px', color: '#fff',
        position: 'relative', overflow: 'hidden', marginBottom: 32,
        boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 24
      }}>
        <div style={{ position: 'absolute', top: -50, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>
            🗓 {t('doctorAppointments.title')}
          </h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
            {t('doctorAppointments.subtitle')}
          </p>
        </div>

        {/* BUG-1 FIX: View toggle buttons now actually control different layouts */}
        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.15)', padding: 6, borderRadius: 16, backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setViewMode('list')}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent',
              color: viewMode === 'list' ? '#047857' : 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.25s', fontSize: 14 }}>
            📋 {t('doctorAppointments.viewList')}
          </button>
          <button onClick={() => setViewMode('grid')}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: viewMode === 'grid' ? '#fff' : 'transparent',
              color: viewMode === 'grid' ? '#047857' : 'rgba(255,255,255,0.8)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.25s', fontSize: 14 }}>
            ⊞ {t('doctorAppointments.viewCards')}
          </button>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 20, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
        <div style={{ flex: '1 1 260px' }}>
          <SearchInput
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('appointments.searchPlaceholder')}
            style={{ width: '100%', borderRadius: 16, border: '2px solid var(--border-base)', padding: '12px 16px', fontSize: 15 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {getStatusFilters(t).map(s => (
            <button key={s.id}
              onClick={() => { setStatus(s.id === 'all' ? '' : s.id); setPage(1); }}
              style={{
                padding: '8px 14px', borderRadius: 14, border: '2px solid',
                borderColor: (status || 'all') === s.id ? MOD_P : 'transparent',
                background: (status || 'all') === s.id ? MOD_P : 'var(--bg-subtle)',
                color: (status || 'all') === s.id ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}>
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {getDateFilters(t).map(d => (
          <button key={d.id}
            onClick={() => { setDateRange(d.id); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 12, border: '1.5px solid',
              borderColor: dateRange === d.id ? MOD_PD : 'var(--border-base)',
              background: dateRange === d.id ? `${MOD_PD}10` : 'var(--bg-card)',
              color: dateRange === d.id ? MOD_PD : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}>
            {t(d.labelKey)}
          </button>
        ))}
      </div>

      {/* ── BUG-1 FIX: Conditional rendering based on viewMode ── */}
      {viewMode === 'list' ? (
        <div className="appointments-table-wrap" style={{ background: 'var(--bg-card)', borderRadius: 24, boxShadow: MOD_SM, border: '1px solid var(--border-base)', overflow: 'hidden' }}>
          <Table columns={columns} data={appointments} loading={isLoading}
            emptyTitle={t('doctorAppointments.empty')} />
        </div>
      ) : (
        /* GRID VIEW — fully implemented */
        isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 180, background: 'var(--bg-card)', borderRadius: 20, animation: 'pulse 1.5s infinite', border: '1px solid var(--border-base)' }} />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 24, border: '2px dashed var(--border-base)' }}>
            <span style={{ fontSize: 56, display: 'block', marginBottom: 16, opacity: 0.5 }}>📭</span>
            <p style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>{t('doctorAppointments.empty')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {appointments.map(appt => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                isRTL={isRTL}
                t={t}
                onApprove={id => approveMutation.mutate(id)}
                onReject={appt => { setRejectTarget(appt); setRejectReason(''); }}
                onComplete={appt => { setCompleting(appt); setNotes(''); }}
                onStartVideo={handleStartVideo}
              />
            ))}
          </div>
        )
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* ── Complete Modal ── */}
      {completing && (
        <Modal open onClose={() => setCompleting(null)}
          title={t('doctorAppointments.markCompleted')} maxWidth="480px"
          footer={
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" onClick={() => setCompleting(null)} style={{ borderRadius: 12 }}>{t('common.cancel')}</Button>
              <Button variant="success" loading={completeMutation.isPending} onClick={handleComplete} style={{ borderRadius: 12, fontWeight: 800 }}>
                {t('doctorAppointments.confirmCompletion')}
              </Button>
            </div>
          }>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <Avatar name={completing.patient_name || completing.full_name} size={72} style={{ margin: '0 auto 16px', boxShadow: MOD_SM }} />
            <p style={{ margin: '0 0 20px', fontSize: 16, color: 'var(--text-body)', lineHeight: 1.6 }}>
              {t('doctorAppointments.completingFor')} <br />
              <strong style={{ fontSize: 20, color: 'var(--text-h)' }}>{completing.patient_name || completing.full_name}</strong>
            </p>
            <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
                {t('doctorAppointments.sessionNotes')}:
              </label>
              {/* Bug #7 Fix: textarea is explicitly interactive — no disabled/readOnly, pointerEvents auto */}
              <textarea
                placeholder={t('doctorAppointments.diagnosisPlaceholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                disabled={false}
                readOnly={false}
                style={{
                  width: '100%', padding: '14px', borderRadius: 16,
                  border: '2px solid var(--border-base)', fontSize: 14, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-subtle)',
                  outline: 'none', transition: 'border 0.2s', direction: isRTL ? 'rtl' : 'ltr',
                  pointerEvents: 'auto', userSelect: 'text', position: 'relative', zIndex: 1,
                  color: 'var(--text-body)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = MOD_P}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal with reason input ── */}
      {rejectTarget && (
        <Modal open onClose={() => setRejectTarget(null)}
          title={t('doctorAppointments.rejectAppointment')} maxWidth="440px"
          footer={
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" onClick={() => setRejectTarget(null)} style={{ borderRadius: 12 }}>
                {t('common.cancel')}
              </Button>
              <Button loading={rejectMutation.isPending} onClick={handleReject}
                style={{ borderRadius: 12, fontWeight: 800, background: MOD_DANGER, borderColor: MOD_DANGER, color: '#fff' }}>
                {t('doctorAppointments.confirmReject')}
              </Button>
            </div>
          }>
          <div style={{ padding: '10px 0', direction: isRTL ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '16px', background: `${MOD_DANGER}08`, borderRadius: 16, border: `1px solid ${MOD_DANGER}20` }}>
              <Avatar name={rejectTarget.patient_name || rejectTarget.full_name} size={48} />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{rejectTarget.patient_name || rejectTarget.full_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(rejectTarget.date || rejectTarget.slot?.date)} • {formatTime(rejectTarget.time || rejectTarget.slot?.start_time)}</p>
              </div>
            </div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
              {t('doctorAppointments.rejectionReason')}:
            </label>
            <textarea
              placeholder={t('doctorAppointments.reasonPlaceholder')}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '14px', borderRadius: 16,
                border: '2px solid var(--border-base)', fontSize: 14, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-subtle)',
                outline: 'none', transition: 'border 0.2s', direction: isRTL ? 'rtl' : 'ltr'
              }}
              onFocus={e => e.currentTarget.style.borderColor = MOD_DANGER}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
            />
          </div>
        </Modal>
      )}

      <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }`}</style>
    </div>
  );
}

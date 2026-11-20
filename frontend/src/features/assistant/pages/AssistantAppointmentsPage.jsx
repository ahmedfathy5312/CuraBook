/**
 * AssistantAppointmentsPage.jsx — Standalone Appointments Page
 *
 * HIGH-01 FIX: Previously /assistant-appointments route displayed AssistantDashboardPage.
 * Now it has its own dedicated page with full appointments management UI.
 *
 * Features:
 *  ✅ Full appointments table (AssistantAppointmentsSection)
 *  ✅ Server-side filtering, sorting, pagination
 *  ✅ Approve / Reject / Bulk actions
 *  ✅ Approve-with-note modal
 *  ✅ Workplace filter
 *  ✅ Search (client-side on current page)
 */
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth }   from '../../../context/AuthContext';
import { useToast }  from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import {
  useAssistantWorkplaces, useAssistantAppointments,
  useApproveAppointment, useRejectAppointment,
  useApproveRescheduleAssistant, useRejectRescheduleAssistant,
} from '../hooks/useAssistantAppointments';
import { useTranslation } from '../../../i18n/useTranslation';
import { tokens } from '../../../theme/tokens';
import { useRTL }  from '../utils/rtlUtils';
import '../styles/rtl.css';

import AssistantAppointmentsSection from '../components/AssistantAppointmentsSection';

const C = {
  teal:   tokens?.colors?.primary?.DEFAULT || '#0E7490',
  red:    tokens?.colors?.danger?.DEFAULT   || '#E97D61',
  border: 'var(--border-base, #E5E7EB)',
  text:   'var(--text-h, #1F2937)',
  muted:  'var(--text-muted, #6B7280)',
  light:  'var(--text-hint, #9CA3AF)',
};

const PAGE_SIZE = 20;

const isNumericValue = (value) => /^\d+$/.test(String(value ?? '').trim());
const getNameFromObject = (value) => {
  if (!value || typeof value !== 'object') return '';
  return value.full_name || value.name || value.display_name
    || [value.first_name, value.last_name].filter(Boolean).join(' ');
};
const getDoctorDisplayName = (appt) => {
  const candidates = [
    appt.doctor_full_name,
    appt.doctor_display_name,
    appt.doctor_name,
    getNameFromObject(appt.doctor),
  ];
  return candidates.find(v => v && !isNumericValue(v)) || '';
};
const getDoctorFilterValue = (appt) => {
  const displayName = getDoctorDisplayName(appt);
  return String(appt.doctor_id || appt.doctor?.id || displayName || '');
};

// ── Reject modal (same as Dashboard) ─────────────────────────────────────────
function RejectModal({ open, title, onClose, onConfirm, loading, t }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!open) setReason(''); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="reject-title"
      style={{ position:'fixed', inset:0, background:'rgba(10,25,47,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:tokens.zIndex?.modal || 1000, padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:440, boxShadow:tokens.shadows?.modal, overflow:'hidden' }}>
        <div style={{ background:`linear-gradient(135deg,${C.red},#c94f3a)`, padding:'22px 26px' }}>
          <h3 id="reject-title" style={{ margin:0, color:'#fff', fontSize:17, fontWeight:800 }}>{title}</h3>
        </div>
        <div style={{ padding:'22px 26px' }}>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder={t('assistantDash.rejectModal.placeholder')} rows={3}
            style={{ width:'100%', padding:'12px 14px', borderRadius:'var(--radius-md)', border:`1.5px solid ${C.border}`, fontSize:13, resize:'vertical', outline:'none', fontFamily:'Cairo,sans-serif', boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={onClose}
              style={{ padding:'9px 22px', borderRadius:'var(--radius-pill)', border:`1.5px solid ${C.border}`, background:'var(--bg-card)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'Cairo,sans-serif' }}>
              {t('assistantDash.rejectModal.cancel')}
            </button>
            <button onClick={() => onConfirm(reason)} disabled={loading}
              style={{ padding:'9px 22px', borderRadius:'var(--radius-pill)', border:'none', background:loading ? C.light : C.red, color:'#fff', cursor:loading ? 'default' : 'pointer', fontSize:13, fontWeight:700, fontFamily:'Cairo,sans-serif' }}>
              {t('assistantDash.rejectModal.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AssistantAppointmentsPage() {
  const { t } = useTranslation();
  const toast  = useToast();
  const qc     = useQueryClient();
  const { isRTL } = useRTL();

  // ── Permission check: fetch /assistant/me/ to know if this assistant can manage appointments
  const { data: assistantMe } = useQuery({
    queryKey: ['assistant', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/assistant/me/');
      return data?.data || data;
    },
    staleTime: 5 * 60_000,
  });
  // Default to true while loading so the UI is not incorrectly locked
  const canManageAppointments = assistantMe
    ? (assistantMe.can_manage_appointments ?? true)
    : true;

  // ── Filter & sort state ──────────────────────────────────────────────────
  const [statusTab,    setStatusTab]    = useState('all');
  const [searchQ,      setSearchQ]      = useState('');
  const [dateFilter,   setDateFilter]   = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [wpFilter,     setWpFilter]     = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');  // NEW
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [page,         setPage]         = useState(1);
  const [sortKey,      setSortKey]      = useState('date');
  const [sortDir,      setSortDir]      = useState('asc');
  const [rejectModal,  setRejectModal]  = useState({ open: false, id: null, type: 'reject' });

  // ── Workplaces ───────────────────────────────────────────────────────────
  const { data: wpData } = useAssistantWorkplaces();
  const clinics   = wpData?.clinics   || [];
  const hospitals = wpData?.hospitals || [];
  const allWP     = [...clinics.map(c => ({ ...c, _type:'clinic' })), ...hospitals.map(h => ({ ...h, _type:'hospital' }))];

  const wpOptions = [
    { value: 'all', label: t('assistantDash.filters.allWorkplaces', 'جميع أماكن العمل') },
    ...clinics.map(c   => ({ value: `clinic_${c.id}`,   label: `🏥 ${c.name || c.clinic_name}` })),
    ...hospitals.map(h => ({ value: `hospital_${h.id}`, label: `🏨 ${h.name || h.hospital_name}` })),
  ];

  // ── Server params ────────────────────────────────────────────────────────
  const SORT_FIELD_MAP = { date: 'date', patient: 'patient_name', status: 'status' };
  const wpServerParam = (() => {
    if (!wpFilter || wpFilter === 'all') return {};
    if (wpFilter.startsWith('clinic_'))   return { clinic:   wpFilter.replace('clinic_',   '') };
    if (wpFilter.startsWith('hospital_')) return { hospital: wpFilter.replace('hospital_', '') };
    return {};
  })();

  const apptParams = {
    page, page_size: PAGE_SIZE,
    ...(statusTab !== 'all' && { status: statusTab.toUpperCase() }),
    ...(dateFilter           && { date_from: dateFilter }),
    ...(dateTo               && { date_to:   dateTo }),
    ...wpServerParam,
    ordering: sortDir === 'desc'
      ? `-${SORT_FIELD_MAP[sortKey] || sortKey}`
      :  (SORT_FIELD_MAP[sortKey] || sortKey),
  };

  const { data: apptRaw, isLoading: apptLoading } = useAssistantAppointments(apptParams);
  const rawAppts   = apptRaw?.results || (Array.isArray(apptRaw) ? apptRaw : []);
  const totalCount = apptRaw?.count ?? rawAppts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Client-side search and doctor filter on current page
  const appointments = rawAppts.filter(a => {
    const q = searchQ.toLowerCase();
    const doctorName = getDoctorDisplayName(a);
    const matchQ = !searchQ
      || (a.patient_name || '').toLowerCase().includes(q)
      || doctorName.toLowerCase().includes(q);
    const matchDoctor = !doctorFilter || doctorFilter === 'all'
      || getDoctorFilterValue(a) === doctorFilter;
    return matchQ && matchDoctor;
  });

  // ── Sort change ──────────────────────────────────────────────────────────
  const handleSortChange = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else              setSortDir('asc');
      return key;
    });
    setPage(1);
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────
  const approveMut           = useApproveAppointment();
  const rejectMut            = useRejectAppointment();
  const approveRescheduleMut = useApproveRescheduleAssistant();
  const rejectRescheduleMut  = useRejectRescheduleAssistant();

  const openReject = useCallback((id, type) => {
    setRejectModal({ open: true, id, type });
  }, []);

  const handleRejectConfirm = (reason) => {
    const { id, type } = rejectModal;
    if (type === 'reschedule') {
      rejectRescheduleMut.mutate({ id, reason }, {
        onSuccess: () => { toast.success(t('assistantDash.toast.rescheduledRejected')); setRejectModal({ open:false, id:null, type:'reject' }); },
        onError:   () => { toast.error(t('assistantDash.toast.rejectFailed')); },
      });
    } else {
      rejectMut.mutate({ id, reason }, {
        onSuccess: () => { toast.success(t('assistantDash.toast.rejected')); setRejectModal({ open:false, id:null, type:'reject' }); qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] }); },
        onError:   () => { toast.error(t('assistantDash.toast.rejectFailed')); },
      });
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback((ids) => {
    ids.forEach(id => approveMut.mutate({ id, note: '' }));
    toast.info(`${t('assistantAppointments.approveShort')} ${ids.length}`);
  }, [approveMut, toast, t]);

  const handleBulkReject = useCallback((ids) => {
    ids.forEach(id => rejectMut.mutate({ id, reason: '' }));
    toast.info(`${t('assistantAppointments.rejectShort')} ${ids.length}`);
  }, [rejectMut, toast, t]);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <span style={{ fontSize:22 }}>📋</span>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text }}>
            {t('assistantAppointments.pageTitle', 'المواعيد')}
          </h1>
          <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>
            {totalCount > 0 ? `${totalCount} ${t('assistantAppointments.totalCount', 'موعد')}` : ''}
          </p>
        </div>
      </div>

      {/* ── Appointments section ── */}
      <AssistantAppointmentsSection
        appointments={appointments}
        rawAppts={rawAppts}
        apptLoading={apptLoading}
        searchQ={searchQ}          setSearchQ={setSearchQ}
        dateFilter={dateFilter}    setDateFilter={setDateFilter}
        dateTo={dateTo}            setDateTo={setDateTo}
        statusTab={statusTab}      setStatusTab={setStatusTab}
        wpFilter={wpFilter}        setWpFilter={setWpFilter}
        wpOptions={wpOptions}      allWP={allWP}
        doctorFilter={doctorFilter} setDoctorFilter={setDoctorFilter}
        expandedRow={expandedRow}  setExpandedRow={setExpandedRow}
        approveMut={approveMut}
        openReject={openReject}
        approveRescheduleMut={approveRescheduleMut}
        page={page}                setPage={setPage}
        totalPages={totalPages}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        canManageAppointments={canManageAppointments}
      />

      {/* ── Reject modal ── */}
      <RejectModal
        open={rejectModal.open}
        title={rejectModal.type === 'reschedule' ? t('assistantDash.rejectModal.rescheduleTitle') : t('assistantDash.rejectModal.title')}
        onClose={() => setRejectModal({ open:false, id:null, type:'reject' })}
        onConfirm={handleRejectConfirm}
        loading={rejectMut.isPending || rejectRescheduleMut.isPending}
        t={t}
      />
    </div>
  );
}

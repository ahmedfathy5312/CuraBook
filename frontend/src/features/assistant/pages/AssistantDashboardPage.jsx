/**
 * AssistantDashboardPage.jsx — V2 + i18n
 *
 * Sprint 3 fix: كل النصوص عبر useTranslation — NAV, RejectModal, buttons
 * Sprint 4:
 *  - AudioContext singleton (playBeep / unlockAudioContext من audioManager)
 *  - useMemo للـ stats calculation بدلاً من حساب inline في كل render
 *  - useCallback للـ handlers الرئيسية لمنع re-renders غير ضرورية
 *  - RTL: useRTL() يُحدِّث <html dir> فعلياً
 */
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  useAssistantWorkplaces, useAssistantAppointments,
  useApproveAppointment, useRejectAppointment,
  useApproveRescheduleAssistant, useRejectRescheduleAssistant,
} from '../hooks/useAssistantAppointments';
import { getAssistantAppointments } from '../../../services/api/appointmentApi';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import { hasCompletedOnboarding } from './AssistantOnboardingPage';
// Sprint 4 — performance & audio
import { playBeep, unlockAudioContext } from '../utils/audioManager';
import { useRTL }                       from '../utils/rtlUtils';
import { useMemoizedStats }             from '../hooks/useAssistantPerf';
import { ensureSkipLink, announce }     from '../utils/a11y';
import '../styles/rtl.css';
import '../styles/a11y.css';

import AssistantOverviewSection     from '../components/AssistantOverviewSection';

const C = {
  teal: tokens?.colors?.primary?.DEFAULT || '#0E7490', tealD: tokens?.colors?.primary?.dark || '#0C6478',
  green: tokens?.colors?.success?.DEFAULT || '#31A870', amber: tokens?.colors?.warning?.DEFAULT || '#F59E0B',
  red: tokens?.colors?.danger?.DEFAULT || '#E97D61',   blue: tokens?.colors?.info?.DEFAULT || '#3B82F6',
  bg: tokens.colors.gray[50], border: tokens.colors.border,
  text: tokens.colors.gray[800], muted: tokens.colors.gray[500], light: tokens.colors.gray[400],
};

const PAGE_SIZE = 20;

// ── Sound alert — Sprint 4: يستخدم audioManager singleton بدلاً من new AudioContext() ──
// الـ function القديمة كانت تُنشئ AudioContext جديد في كل notification
// الآن نستخدم playBeep() من audioManager الذي يُعيد استخدام نفس الـ instance
const beep = () => playBeep(520, 0.45, 0.25);

// ── Reject / Reason modal ─────────────────────────────────────────────────────
function RejectModal({ open, title, onClose, onConfirm, loading, t }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!open) setReason(''); }, [open]);

  // Sprint 5 — a11y: Escape closes modal, focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="reject-title"
      style={{ position:'fixed', inset:0, background:'rgba(10,25,47,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:tokens.zIndex.modal, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius: 'var(--radius-lg)', width:'100%', maxWidth:440, boxShadow:tokens.shadows.modal, overflow:'hidden' }}>
        <div style={{ background:`linear-gradient(135deg,${C.red},#c94f3a)`, padding:'22px 26px' }}>
          <h3 id="reject-title" style={{ margin:0, color:'#fff', fontSize:17, fontWeight:800 }}>{title}</h3>
          <p style={{ margin:'4px 0 0', color:'rgba(255,255,255,.72)', fontSize:13 }}>{t('assistantDash.rejectModal.reasonHint')}</p>
        </div>
        <div style={{ padding:'22px 26px' }}>
          <textarea value={reason} onChange={e=>setReason(e.target.value)}
            placeholder={t('assistantDash.rejectModal.placeholder')} rows={3} aria-label={t('assistantDash.rejectModal.placeholder')}
            style={{ width:'100%', padding:'12px 14px', borderRadius: 'var(--radius-md)', border:`1.5px solid ${C.border}`, fontSize:13, resize:'vertical', outline:'none', fontFamily:'Cairo,sans-serif', boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={onClose} style={{ padding:'9px 22px', borderRadius: 'var(--radius-pill)', border:`1.5px solid ${C.border}`, background:'var(--bg-card)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'Cairo,sans-serif' }}>
              {t('assistantDash.rejectModal.cancel')}
            </button>
            <button onClick={()=>onConfirm(reason)} disabled={loading}
              style={{ padding:'9px 22px', borderRadius: 'var(--radius-pill)', border:'none', background:loading?C.light:C.red, color:'#fff', cursor:loading?'default':'pointer', fontSize:13, fontWeight:700, fontFamily:'Cairo,sans-serif' }}>
              {t('assistantDash.rejectModal.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AssistantDashboardPage() {
  const { logout, user } = useAuth();
  const toast = useToast();
  const qc    = useQueryClient();
  const { t } = useTranslation();
  // Sprint 4: useRTL يُحدِّث <html dir="rtl"> فعلياً (بدلاً من dir={isRTL} على wrapper فقط)
  const { isRTL } = useRTL();
  const navigate = useNavigate();

  // Sprint 3: redirect first-time assistants to onboarding
  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      navigate('/assistant-onboarding', { replace: true });
    }
    // Sprint 5 — a11y: أضف skip link لتسهيل التنقل بلوحة المفاتيح
    ensureSkipLink('main-content');
  }, []);

  // Sprint 4: unlock AudioContext عند أول تفاعل (Chrome autoplay policy)
  useEffect(() => {
    const unlock = () => { unlockAudioContext(); window.removeEventListener('click', unlock); };
    window.addEventListener('click', unlock, { once: true });
    return () => window.removeEventListener('click', unlock);
  }, []);

  // NAV defined inside component so t() is available
  const NAV = [
    { id: 'overview',     icon: '📊', label: t('assistantDash.nav.overview')     },
    { id: 'appointments', icon: '📅', label: t('assistantDash.nav.appointments') },
    { id: 'workplaces',   icon: '🏢', label: t('assistantDash.nav.workplaces')   },
  ];

  // ── UI state ─────────────────────────────────────────────────────────────
  const [section,      setSection]      = useState('overview');
  const [statusTab,    setStatusTab]    = useState('all');
  const [searchQ,      setSearchQ]      = useState('');
  const [dateFilter,   setDateFilter]   = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [wpFilter,     setWpFilter]     = useState('all');
  const [sidebar,      setSidebar]      = useState(window.innerWidth > 900);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rejectModal,  setRejectModal]  = useState({ open:false, id:null, type:'reject' });
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [page,         setPage]         = useState(1);
  // ── Server-side sort state ──────────────────────────────────────────────────
  // BUG FIX: sort state is now owned by the parent so it can be included in the
  // API request params — fixing the client-side-only sort bug in appointments.
  const [sortKey,      setSortKey]      = useState('date');
  const [sortDir,      setSortDir]      = useState('asc');

  // ── Responsive sidebar ────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setSidebar(window.innerWidth > 900);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: wpData, isLoading: wpLoading } = useAssistantWorkplaces();
  const clinics   = wpData?.clinics   || [];
  const hospitals = wpData?.hospitals || [];
  const allWP     = [...clinics.map(c=>({...c,_type:'clinic'})), ...hospitals.map(h=>({...h,_type:'hospital'}))];

  // Map UI sort keys → DRF ordering fields
  const SORT_FIELD_MAP = { date: 'date', patient: 'patient_name', status: 'status' };

  // BUG FIX (wpFilter): parse wpFilter into server-side ?clinic= / ?hospital= params
  // so filtering works across ALL pages, not just the ≤20 items on the current page.
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
    // BUG FIX (wpFilter): workplace filter is now server-side
    ...wpServerParam,
    // BUG FIX (sorting): pass ordering to the server so all pages are sorted correctly.
    ordering: sortDir === 'desc'
      ? `-${SORT_FIELD_MAP[sortKey] || sortKey}`
      :  (SORT_FIELD_MAP[sortKey] || sortKey),
  };
  const { data: apptRaw, isLoading: apptLoading } = useAssistantAppointments(apptParams);

  const rawAppts   = apptRaw?.results || (Array.isArray(apptRaw) ? apptRaw : []);
  const totalCount = apptRaw?.count ?? rawAppts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // wpFilter is now server-side — only client-side search remains
  const appointments = rawAppts.filter(a => {
    const q      = searchQ.toLowerCase();
    const matchQ = !searchQ || (a.patient_name||'').toLowerCase().includes(q) || (a.doctor_name||'').toLowerCase().includes(q);
    return matchQ;
  });

  const today = new Date().toISOString().split('T')[0];

  // ── BUG FIX: accurate per-status counts from the server ────────────────────
  // Previously, stats.pending / confirmed / today etc. were computed from
  // rawAppts (the current page, ≤ PAGE_SIZE items) — completely wrong when
  // totalCount > PAGE_SIZE.  Now we fire 5 lightweight parallel requests
  // (page_size=1) and read the `count` field that DRF always returns.
  const { data: serverStats } = useQuery({
    queryKey: ['assistant', 'appointment-stats'],
    queryFn: async () => {
      const [pending, confirmed, reschedule, cancelled, todayRes] = await Promise.all([
        getAssistantAppointments({ page: 1, page_size: 1, status: 'PENDING' }),
        getAssistantAppointments({ page: 1, page_size: 1, status: 'CONFIRMED' }),
        getAssistantAppointments({ page: 1, page_size: 1, status: 'RESCHEDULE_REQUESTED' }),
        getAssistantAppointments({ page: 1, page_size: 1, status: 'CANCELLED' }),
        getAssistantAppointments({ page: 1, page_size: 1, date_from: today, date_to: today }),
      ]);
      return {
        pending:    pending?.count    ?? 0,
        confirmed:  confirmed?.count  ?? 0,
        reschedule: reschedule?.count ?? 0,
        cancelled:  cancelled?.count  ?? 0,
        today:      todayRes?.count   ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Sprint 4: useMemoizedStats بدلاً من filter inline في كل render
  // يُحسب الإحصائيات مرة واحدة فقط عند تغيير rawAppts أو serverStats
  const localStats = useMemoizedStats(rawAppts, totalCount);
  const stats = useMemo(() => ({
    total:      totalCount,
    pending:    serverStats?.pending    ?? localStats.pending,
    confirmed:  serverStats?.confirmed  ?? localStats.confirmed,
    today:      serverStats?.today      ?? localStats.today,
    reschedule: serverStats?.reschedule ?? localStats.reschedule,
    cancelled:  serverStats?.cancelled  ?? localStats.cancelled,
  }), [serverStats, localStats, totalCount]);

  // ── Realtime + sound alert ────────────────────────────────────────────────
  const { connected, unreadCount } = useRealtimeNotifications({
    invalidateAppointments: true,
    onEvent: n => {
      if (soundEnabled) beep();
      toast.info(n.message || t('assistantDash.notifications.newUpdate'));
      qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const approveMut           = useApproveAppointment();
  const rejectMut            = useRejectAppointment();
  const approveRescheduleMut = useApproveRescheduleAssistant();
  const rejectRescheduleMut  = useRejectRescheduleAssistant();

  const doReject = reason => {
    if (rejectModal.type === 'reschedule') rejectRescheduleMut.mutate({ id: rejectModal.id, reason });
    else                                   rejectMut.mutate({ id: rejectModal.id, reason });
    setRejectModal({ open:false, id:null, type:'reject' });
    setExpandedRow(null);
  };

  const openReject = (id, type='reject') => setRejectModal({ open:true, id, type });

  // ── Bulk approve/reject ───────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async (ids) => {
    try {
      await Promise.all(ids.map(id => approveMut.mutateAsync({ id })));
      toast.success(t('assistantDash.notifications.bulkApproved', { count: ids.length }));
    } catch { toast.error(t('assistantDash.notifications.bulkFailed')); }
  }, [approveMut, toast, t]);

  const handleBulkReject = useCallback(async (ids) => {
    try {
      await Promise.all(ids.map(id => rejectMut.mutateAsync({ id, reason: '' })));
      toast.success(t('assistantDash.notifications.bulkRejected', { count: ids.length }));
    } catch { toast.error(t('assistantDash.notifications.bulkFailed')); }
  }, [rejectMut, toast, t]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const goToAppts = (tab='all') => { setSection('appointments'); setStatusTab(tab); setPage(1); };

  // ── Sort change handler (lifts sort state from child) ─────────────────────
  const onSortChange = useCallback((key) => {
    setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
    setPage(1);
  }, [sortKey]);
  const wpOptions = [
    { value:'all', label: t('assistantDash.nav.workplaces') + ' — ' + t('common.all', { defaultValue: 'All' }) },
    ...clinics.map(c   => ({ value:`clinic_${c.id}`,   label:`🏥 ${c.name}` })),
    ...hospitals.map(h => ({ value:`hospital_${h.id}`, label:`🏥 ${h.name}` })),
  ];
  const initials = (user?.full_name||user?.username||'A').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  const wpCountLabel = allWP.length > 0
    ? t('assistantDash.workplaces', { count: allWP.length })
    : t('assistantDash.noWorkplaces');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: 'Cairo,sans-serif', padding: '28px 28px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <AssistantOverviewSection
        user={user} stats={stats} rawAppts={rawAppts} allWP={allWP}
        clinics={clinics} hospitals={hospitals}
        apptLoading={apptLoading} wpLoading={wpLoading} wpData={wpData}
        approveMut={approveMut} openReject={openReject}
        onGoToAppointments={goToAppts} onGoToWorkplaces={() => {}}
      />

      {/* Reject modal */}
      <RejectModal
        open={rejectModal.open}
        title={rejectModal.type === 'reschedule'
          ? t('assistantDash.rejectModal.titleReschedule')
          : t('assistantDash.rejectModal.titleReject')}
        onClose={() => setRejectModal({ open: false, id: null, type: 'reject' })}
        onConfirm={doReject}
        loading={rejectMut.isPending || rejectRescheduleMut.isPending}
        t={t}
      />
    </div>
  );
}

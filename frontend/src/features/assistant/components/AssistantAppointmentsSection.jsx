/**
 * AssistantAppointmentsSection.jsx — V3 (PDF Slide 14 — New Design)
 *
 * V3 Changes:
 *  ✅ Modern card-style table rows with clear visual hierarchy
 *  ✅ Full-label action buttons: "تأكيد" / "رفض" / "عرض التفاصيل"
 *  ✅ Expandable detail panel per row (inline, no navigation needed)
 *  ✅ Status badge with colour-coded left border per row
 *  ✅ Bulk Approve / Reject  — select multiple rows, act on all at once
 *  ✅ Quick Date Presets     — Today / Tomorrow / This Week / All buttons
 *  ✅ Pagination             — page + page_size, controlled by parent
 *  ✅ Column Sorting         — click headers to sort by date, patient, status
 *  ✅ Print Schedule         — @media print hides sidebar/filters, shows table
 *  ✅ Approve with Note      — optional message to patient before confirming
 */
import { memo, useState, useEffect } from 'react';
import { tokens } from '../../../theme/tokens';
import Avatar from '../../../components/ui/Avatar';
import Badge  from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import Pagination from '../../../components/ui/Pagination';
import { formatDate, formatTime } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';

const C = {
  teal:   tokens?.colors?.primary?.DEFAULT || '#0E7490',
  tealD:  tokens?.colors?.primary?.dark || '#0C6478',
  green:  tokens?.colors?.success?.DEFAULT || '#31A870',
  amber:  tokens?.colors?.warning?.DEFAULT || '#F59E0B',
  red:    tokens?.colors?.danger?.DEFAULT || '#E97D61',
  blue:   tokens?.colors?.info?.DEFAULT || '#3B82F6',
  purple: '#8B5CF6',
  border: 'var(--border-base, #E5E7EB)',
  text:   'var(--text-h, #1F2937)',
  muted:  'var(--text-muted, #6B7280)',
  light:  'var(--text-hint, #9CA3AF)',
  card:   'var(--bg-card, #fff)',
  subtle: 'var(--bg-subtle, #F8FAFC)',
  hover:  'var(--bg-hover, #E5E7EB)',
};

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

const getStatusTabs = (t) => [
  { id: 'all',                  label: t('assistantAppointments.statusTabs.all') },
  { id: 'pending',              label: t('assistantAppointments.statusTabs.pending') },
  { id: 'confirmed',            label: t('assistantAppointments.statusTabs.confirmed') },
  { id: 'reschedule_requested', label: t('assistantAppointments.statusTabs.reschedule_requested') },
  { id: 'completed',            label: t('assistantAppointments.statusTabs.completed') },
  { id: 'cancelled',            label: t('assistantAppointments.statusTabs.cancelled') },
];
const TAB_COLORS = {
  pending: C.amber, confirmed: C.green, completed: C.blue,
  cancelled: C.red, reschedule_requested: C.purple, all: C.teal,
};

const Shimmer = ({ h = 44, r = 12 }) => <Skeleton style={{ height: h, borderRadius: r }} />;
const Spinner = ({ size = 14, color = '#fff' }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${color}40`, borderTopColor: color, animation: 'spin .7s linear infinite', flexShrink: 0 }} />
);

// ── Approve-with-Note modal ───────────────────────────────────────────────────
function ApproveNoteModal({ open, patientName, onConfirm, onCancel, loading }) {
  const { t } = useTranslation(); // FIX: t was not in scope — module-level function can't close over component's t
  const [note, setNote] = useState('');
  // Reset note every time modal opens (not just on initial mount)
  useEffect(() => { if (open) setNote(''); }, [open]);
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      role="alertdialog" aria-modal="true" aria-labelledby="approve-modal-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,25,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: tokens.zIndex.modal, padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, boxShadow: tokens.shadows.modal, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg,${C.green},#269660)`, padding: '22px 26px' }}>
          <h3 id="approve-modal-title" style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>
            {t('assistantAppointments.approveBtn')}
          </h3>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.75)', fontSize: 13 }}>
            {patientName} — {t('assistantAppointments.noteForPatient')}
          </p>
        </div>
        <div style={{ padding: '22px 26px' }}>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder={t('assistantAppointments.noteForPatient')}
            rows={3} aria-label={t('assistantAppointments.noteForPatient')}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'Cairo,sans-serif', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={onCancel} style={{ padding: '9px 22px', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Cairo,sans-serif' }}>{t('assistantAppointments.cancelBtn')}</button>
            <button onClick={() => onConfirm(note)} disabled={loading}
              style={{ padding: '9px 22px', borderRadius: 'var(--radius-pill)', border: 'none', background: loading ? C.light : C.green, color: '#fff', cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading && <Spinner size={13} />}
              {t('assistantAppointments.confirmApprovalBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────
function BulkActionBar({ count, onApproveAll, onRejectAll, onClearSelection, loading }) {
  const { t } = useTranslation(); // FIX: t was not in scope — module-level function can't close over component's t
  if (count === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: `${C.teal}12`, border: `1.5px solid ${C.teal}40`, borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>{t('assistantAppointments.selectedCount', { count })}</span>
      <div style={{ flex: 1 }} />
      <button onClick={onApproveAll} disabled={loading}
        aria-label={`${t('assistantAppointments.approveShort')} ${count}`}
        style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
        {loading && <Spinner size={11} />}
        {t('assistantAppointments.approveShort')} {count}
      </button>
      <button onClick={onRejectAll} disabled={loading}
        aria-label={`${t('assistantAppointments.rejectShort')} ${count}`}
        style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo,sans-serif' }}>
        {t('assistantAppointments.rejectShort')} {count}
      </button>
      <button onClick={onClearSelection} aria-label="Clear selection"
        style={{ padding: '7px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', fontSize: 12, fontWeight: 600, color: C.muted, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>
        {t('assistantAppointments.clearBtn')}
      </button>
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }) {
  if (!active) return <span style={{ opacity: 0.25, fontSize: 10 }}>↕</span>;
  return <span style={{ fontSize: 10, color: C.teal }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function AssistantAppointmentsSection({
  appointments, rawAppts, apptLoading,
  searchQ, setSearchQ,
  dateFilter, setDateFilter,
  dateTo, setDateTo,
  statusTab, setStatusTab,
  wpFilter, setWpFilter,
  wpOptions, allWP,
  doctorFilter, setDoctorFilter,   // NEW: doctor filter
  expandedRow, setExpandedRow,
  approveMut, openReject,
  approveRescheduleMut,
  // Pagination props
  page, setPage, totalPages,
  // Bulk + note props from parent
  onBulkApprove, onBulkReject,
  // BUG FIX: sort state is now owned by the parent (AssistantDashboardPage) and
  // included in the API request params, so sorting affects ALL pages, not just
  // the current page loaded in the client.
  sortKey, sortDir, onSortChange,
  // Permission: if false, approve/reject actions are disabled
  canManageAppointments = true,
}) {
  // ── Local state ──────────────────────────────────────────────────────────
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds]   = useState(new Set());
  // sortKey / sortDir / onSortChange come from parent — see props above
  const [approveNote, setApproveNote]   = useState(null); // { id, patientName }

  // ── Quick date presets ───────────────────────────────────────────────────
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const weekEnd  = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

  const DATE_PRESETS = [
    { label: t('assistantAppointments.datePresets.all'),       value: '',       end: '' },
    { label: t('assistantAppointments.datePresets.today'),     value: today,    end: today },
    { label: t('assistantAppointments.datePresets.tomorrow'),  value: tomorrow, end: tomorrow },
    { label: t('assistantAppointments.datePresets.thisWeek'), value: today,    end: weekEnd },
  ];
  const activePreset = DATE_PRESETS.find(p => p.value === dateFilter) || DATE_PRESETS[0];

  // ── Sorting (server-side) ────────────────────────────────────────────────
  // BUG FIX: the old implementation sorted the current page's items in the
  // browser with useMemo.  When totalPages > 1 this produced wrong results:
  // e.g. sorting by date descending only reversed the 20 items on page 1.
  // Sort state is now owned by AssistantDashboardPage and passed to the API
  // as an `ordering` param — the server returns pre-sorted pages.
  // `appointments` arrives already sorted; we just render it as-is.
  const sorted = appointments;

  const onSort = (key) => {
    onSortChange?.(key);
    setPage?.(1);
  };

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allPendingIds = sorted.filter(a => a.status?.toLowerCase() === 'pending').map(a => a.id);
  const allSelected   = allPendingIds.length > 0 && allPendingIds.every(id => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allPendingIds));
  };

  const handleBulkApprove = () => {
    // Only pass pending IDs — never try to approve already-confirmed/rejected
    onBulkApprove?.(pendingSelected);
    setSelectedIds(new Set());
  };
  const handleBulkReject = () => {
    onBulkReject?.(pendingSelected);
    setSelectedIds(new Set());
  };

  // ── Approve with note ────────────────────────────────────────────────────
  const handleApproveClick = (apt) => {
    setApproveNote({ id: apt.id, patientName: apt.patient_name || apt.patientName || 'Patient' });
  };
  const handleApproveConfirm = (note) => {
    approveMut.mutate({ id: approveNote.id, note });
    setApproveNote(null);
  };

  // ── Print handler ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const prev = document.title;
    document.title = `Schedule — ${today}`;
    window.print();
    document.title = prev;
  };

  const pendingSelected = [...selectedIds].filter(id => {
    const apt = appointments.find(a => a.id === id);
    return apt?.status?.toLowerCase() === 'pending';
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeUp .3s ease' }} className="apt-section-print">

      {/* ── Filter bar ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 14, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Date presets */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => { setDateFilter(p.value); setDateTo?.(p.end); setPage?.(1); }}
              aria-pressed={activePreset.label === p.label}
              style={{ padding: '6px 14px', borderRadius: 9, border: `1.5px solid ${activePreset.label === p.label ? C.teal : C.border}`, background: activePreset.label === p.label ? `${C.teal}12` : 'var(--bg-card)', color: activePreset.label === p.label ? C.teal : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', transition: 'all .15s' }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: C.border }} />

        {/* Search */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, background: C.subtle, border: `1.5px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 14px' }}>
          <span style={{ color: C.light }} aria-hidden="true">🔍</span>
          <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage?.(1); }}
            placeholder={t('assistantAppointments.searchPlaceholder')}
            aria-label="Search appointments"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'Cairo,sans-serif', flex: 1, color: C.text }} />
          {searchQ && <button onClick={() => { setSearchQ(''); setPage?.(1); }} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.light, fontSize: 14 }}>✕</button>}
        </div>

        {/* Workplace filter */}
        {allWP.length > 0 && (
          <select value={wpFilter} onChange={e => { setWpFilter(e.target.value); setPage?.(1); }}
            aria-label="Filter by workplace"
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, fontFamily: 'Cairo,sans-serif', color: C.text, outline: 'none', minWidth: 160 }}>
            {wpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {/* Doctor filter — derived from rawAppts unique doctors */}
        {(() => {
          const doctors = [...new Map(
            rawAppts
              .map(a => ({ name: getDoctorDisplayName(a), id: getDoctorFilterValue(a) }))
              .filter(d => d.name && d.id)
              .map(d => [d.id, d])
          ).values()];
          if (doctors.length < 2) return null;
          return (
            <select
              value={doctorFilter || 'all'}
              onChange={e => { setDoctorFilter?.(e.target.value); setPage?.(1); }}
              aria-label="Filter by doctor"
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, fontFamily: 'Cairo,sans-serif', color: C.text, outline: 'none', minWidth: 160 }}
            >
              <option value="all">👨‍⚕️ كل الأطباء</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          );
        })()}

        {/* Print button */}
        <button onClick={handlePrint} aria-label="Print today's schedule"
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('assistantAppointments.printBtn')}
        </button>

        {/* Clear filters */}
        {(searchQ || dateFilter || wpFilter !== 'all' || (doctorFilter && doctorFilter !== 'all')) && (
          <button onClick={() => { setSearchQ(''); setDateFilter(''); setDateTo?.(''); setWpFilter('all'); setDoctorFilter?.('all'); setPage?.(1); }}
            aria-label="Clear all filters"
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: 'Cairo,sans-serif' }}>
            ✕ {t('assistantAppointments.clearBtn')}
          </button>
        )}
      </div>

      {/* ── Status tabs ── */}
      <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {getStatusTabs(t).map(tab => {
          const cnt = tab.id === 'all' ? rawAppts.length : rawAppts.filter(a => a.status?.toLowerCase() === tab.id || a.status?.toUpperCase() === tab.id.toUpperCase()).length;
          const color  = TAB_COLORS[tab.id] || C.teal;
          const active = statusTab === tab.id;
          return (
            <button key={tab.id} role="tab" aria-selected={active}
              onClick={() => { setStatusTab(tab.id); setPage?.(1); setSelectedIds(new Set()); }}
              style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? color : C.border}`, background: active ? color + '22' : C.card, color: active ? color : C.muted, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
              {tab.label}
              {cnt > 0 && <span style={{ background: active ? color : C.hover, color: active ? '#fff' : C.muted, borderRadius: 'var(--radius-full)', padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Bulk action bar ── */}
      <BulkActionBar
        count={pendingSelected.length}
        onApproveAll={handleBulkApprove}
        onRejectAll={handleBulkReject}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={approveMut.isPending}
      />

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minWidth: 720 }}>

          {/* ── Table Header ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.6fr 1fr 1fr 120px 1fr', padding: '11px 18px', background: C.subtle, borderBottom: `1.5px solid ${C.border}` }}>
            {/* Select-all checkbox */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                aria-label={t('assistantAppointments.selectAll')}
                title={t('assistantAppointments.selectAll')}
                style={{ cursor: 'pointer', accentColor: C.teal }} />
            </div>
            {[
              { key: 'patient', label: t('assistantAppointments.table.patient') },
              { key: 'doctor',  label: t('assistantAppointments.table.doctorWorkplace'), noSort: true },
              { key: 'date',    label: t('assistantAppointments.table.date') },
              { key: 'time',    label: t('assistantAppointments.table.time'), noSort: true },
              { key: 'status',  label: t('assistantAppointments.table.status') },
              { key: 'actions', label: t('assistantAppointments.table.actions'), noSort: true },
            ].map(h => (
              <button key={h.key} onClick={() => !h.noSort && onSort(h.key)}
                aria-label={h.noSort ? h.label : `${t('a11y.sortAsc')} ${h.label}`}
                style={{ background: 'none', border: 'none', cursor: h.noSort ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: sortKey === h.key ? C.teal : C.muted, fontFamily: 'Cairo,sans-serif', textAlign: 'start' }}>
                {h.label}
                {!h.noSort && <SortIcon active={sortKey === h.key} dir={sortDir} />}
              </button>
            ))}
          </div>

          {/* ── Loading Skeleton ── */}
          {apptLoading && (
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => <Shimmer key={i} h={68} r={10} />)}
            </div>
          )}

          {/* ── Empty State ── */}
          {!apptLoading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
              <p style={{ fontWeight: 800, margin: '0 0 6px', fontSize: 15, color: C.text }}>{t('assistantAppointments.noAppointments')}</p>
              <p style={{ fontSize: 13, color: C.light }}>{t('assistantAppointments.adjustFilters')}</p>
            </div>
          )}

          {/* ── Rows (New Design — PDF Slide 14) ── */}
          {!apptLoading && sorted.map((apt) => {
            const isPending    = apt.status?.toLowerCase() === 'pending';
            const isReschedule = apt.status?.toUpperCase() === 'RESCHEDULE_REQUESTED';
            const isExpanded   = expandedRow === apt.id;
            const isSelected   = selectedIds.has(apt.id);
            const name         = apt.patient_name || apt.patientName     || '—';
            const doctor       = getDoctorDisplayName(apt) || t('assistantAppointments.unknownDoctor', 'طبيب غير محدد');
            const workplace    = apt.clinic_name  || apt.hospital_name   || apt.clinic  || '—';

            // left-border colour by status
            const rowAccent = isPending ? C.amber
              : isReschedule ? C.purple
              : apt.status?.toLowerCase() === 'confirmed' ? C.green
              : apt.status?.toLowerCase() === 'cancelled' ? C.red
              : apt.status?.toLowerCase() === 'completed' ? C.blue
              : C.light;

            return (
              <div key={apt.id}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  borderRight: `3px solid ${rowAccent}`,
                  background: isSelected ? `${C.teal}18` : isExpanded ? `${C.teal}12` : 'var(--bg-card)',
                  transition: 'background .15s, border-color .15s',
                }}>

                {/* ── Main row ── */}
                <div
                  style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.6fr 1fr 1fr 120px 1fr', padding: '14px 18px', alignItems: 'center', gap: 4 }}
                  role="row"
                >

                  {/* Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isPending && (
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(apt.id)}
                        aria-label={`Select appointment for ${name}`}
                        style={{ cursor: 'pointer', accentColor: C.teal }} />
                    )}
                  </div>

                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar name={name} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      {apt.phone && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.light }}>{apt.phone}</p>}
                    </div>
                  </div>

                  {/* Doctor / Workplace */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.teal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: C.light, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workplace}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{formatDate(apt.date || apt.slot_date)}</p>
                  </div>

                  {/* Time */}
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{formatTime(apt.time || apt.slot_time)}</p>
                  </div>

                  {/* Status badge */}
                  <Badge status={apt.status} />

                  {/* ── Action buttons — NEW full-label design ── */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }} onClick={e => e.stopPropagation()}>

                    {/* Permission-locked state */}
                    {!canManageAppointments && (isPending || isReschedule) && (
                      <span style={{ fontSize: 11, color: C.muted, background: C.subtle, borderRadius: 'var(--radius-md)', padding: '5px 10px', border: `1px solid ${C.border}`, fontWeight: 600 }}>
                        🔒 صلاحية محدودة
                      </span>
                    )}

                    {/* Pending appointment actions */}
                    {canManageAppointments && isPending && (
                      <>
                        <button
                          onClick={() => handleApproveClick(apt)}
                          disabled={approveMut.isPending}
                          aria-label={`تأكيد الموعد لـ ${name}`}
                          style={{ padding: '6px 13px', borderRadius: 'var(--radius-md)', border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: approveMut.isPending ? 'not-allowed' : 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'opacity .15s', opacity: approveMut.isPending ? 0.7 : 1 }}>
                          {approveMut.isPending && approveMut.variables?.id === apt.id && <Spinner size={11} />}
                          ✓ تأكيد
                        </button>
                        <button
                          onClick={() => openReject(apt.id, 'reject')}
                          aria-label={`رفض الموعد لـ ${name}`}
                          style={{ padding: '6px 13px', borderRadius: 'var(--radius-md)', border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', whiteSpace: 'nowrap' }}>
                          ✕ رفض
                        </button>
                      </>
                    )}

                    {/* Reschedule actions */}
                    {canManageAppointments && isReschedule && (
                      <>
                        <button
                          onClick={() => approveRescheduleMut.mutate(apt.id)}
                          disabled={approveRescheduleMut.isPending}
                          aria-label={`قبول إعادة الجدولة لـ ${name}`}
                          style={{ padding: '6px 11px', borderRadius: 'var(--radius-md)', border: 'none', background: C.blue, color: '#fff', fontSize: 11, fontWeight: 700, cursor: approveRescheduleMut.isPending ? 'not-allowed' : 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          {approveRescheduleMut.isPending && <Spinner size={10} />}
                          ✓ قبول
                        </button>
                        <button
                          onClick={() => openReject(apt.id, 'reschedule')}
                          aria-label={`رفض إعادة الجدولة لـ ${name}`}
                          style={{ padding: '6px 11px', borderRadius: 'var(--radius-md)', border: 'none', background: C.red, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', whiteSpace: 'nowrap' }}>
                          ✕ رفض
                        </button>
                      </>
                    )}

                    {/* View Details button — always visible */}
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : apt.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `إخفاء تفاصيل ${name}` : `عرض تفاصيل ${name}`}
                      style={{ padding: '6px 11px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${isExpanded ? C.teal : C.border}`, background: isExpanded ? `${C.teal}12` : 'var(--bg-card)', color: isExpanded ? C.teal : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all .15s' }}>
                      {isExpanded ? '▲ إخفاء' : '▼ التفاصيل'}
                    </button>
                  </div>
                </div>

                {/* ── Expanded Detail Panel ── */}
                {isExpanded && (
                  <div style={{ padding: '4px 18px 18px 60px', animation: 'fadeUp .18s ease' }}>
                    <div style={{ background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        تفاصيل الموعد — #{apt.id}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {[
                          { icon: '📧', label: t('assistantAppointments.patientEmail'),   value: apt.patient_email || apt.email || '—' },
                          { icon: '🎂', label: t('assistantAppointments.patientAge'),     value: apt.age ? `${apt.age} سنة` : '—' },
                          { icon: '👤', label: t('assistantAppointments.gender'),          value: apt.gender || '—' },
                          { icon: '🩺', label: t('assistantAppointments.chiefComplaint'), value: apt.reason || apt.chief_complaint || '—' },
                          { icon: '📝', label: t('assistantAppointments.notes'),           value: apt.notes || '—' },
                          { icon: '🏥', label: 'مكان الموعد',                               value: workplace },
                        ].map(({ icon, label, value }) => (
                          <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '10px 13px', border: `1px solid ${C.border}` }}>
                            <p style={{ margin: '0 0 3px', fontSize: 10, color: C.light, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
                              {icon} {label}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer: count + pagination ── */}
      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: C.light, margin: 0 }}>
            {t('assistantAppointments.showingCount', { count: sorted.length })}
            {rawAppts.length !== appointments.length ? t('assistantAppointments.filteredFrom', { total: rawAppts.length }) : ''}
          </p>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); setSelectedIds(new Set()); }} />
          )}
        </div>
      )}

      {/* ── Approve with Note modal ── */}
      <ApproveNoteModal
        open={!!approveNote}
        patientName={approveNote?.patientName}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveNote(null)}
        loading={approveMut.isPending}
      />

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          aside, header, .filter-bar, [role="tablist"], nav[aria-label="Pagination"] { display: none !important; }
          main { width: 100% !important; padding: 0 !important; }
          .apt-section-print { padding: 0 !important; }
          body { font-size: 11px !important; }
          button { display: none !important; }
          input[type="checkbox"] { display: none !important; }
        }
      `}</style>
    </div>
  );
});

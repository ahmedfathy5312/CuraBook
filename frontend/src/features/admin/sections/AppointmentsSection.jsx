/**
 * AppointmentsSection.jsx — Admin Appointments Management
 * Sprint 3: Advanced Filtering
 * Sprint 4: Bulk Actions
 * Gap #4: 3 views — List (Table) + Calendar + Kanban
 */
import { useState, useCallback, useMemo } from 'react';
import Badge from '../../../components/ui/Badge';
import { Table } from '../../../components/ui/Table';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';
import BulkActionBar from '../components/BulkActionBar';
import { useBulkSelect, exportToCSV } from '../hooks/useBulkSelect';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const SUCCESS = tokens?.colors?.success?.DEFAULT || '#31A870';
const WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const DANGER  = tokens?.colors?.danger?.DEFAULT  || '#E97D61';

const STATUS_CFG = {
  pending:              { label: 'قيد الانتظار', color: WARNING,   bg: '#FEF3C7' },
  confirmed:            { label: 'مؤكد',         color: PRIMARY,   bg: '#E0F7FA' },
  completed:            { label: 'مكتمل',        color: SUCCESS,   bg: '#D1FAE5' },
  cancelled:            { label: 'ملغي',         color: DANGER,    bg: '#FEE2E2' },
  rejected:             { label: 'مرفوض',        color: '#EF4444', bg: '#FEE2E2' },
  no_show:              { label: 'لم يحضر',      color: 'var(--text-hint)', bg: '#F1F5F9' },
  reschedule_requested: { label: 'طلب تأجيل',   color: '#8B5CF6', bg: '#EDE9FE' },
};

const KANBAN_COLUMNS = [
  { key: 'pending',   title: 'قيد الانتظار', color: WARNING  },
  { key: 'confirmed', title: 'مؤكد',         color: PRIMARY  },
  { key: 'completed', title: 'مكتمل',        color: SUCCESS  },
  { key: 'cancelled', title: 'ملغي',         color: DANGER   },
];

const FILTER_CONFIG = [
  {
    key: 'status', label: 'الحالة', type: 'select',
    options: [
      { value: 'pending',              label: 'قيد الانتظار' },
      { value: 'confirmed',            label: 'مؤكد'         },
      { value: 'completed',            label: 'مكتمل'        },
      { value: 'cancelled',            label: 'ملغي'         },
      { value: 'rejected',             label: 'مرفوض'        },
      { value: 'no_show',              label: 'لم يحضر'      },
      { value: 'reschedule_requested', label: 'طلب تأجيل'    },
    ],
  },
  { key: 'date_range', label: 'نطاق التاريخ', type: 'daterange' },
];

const EMPTY_FILTERS = { status: null, date_range: null };

const EXPORT_COLS = [
  { header: 'المريض',   key: 'patient_name'  },
  { header: 'الطبيب',   key: 'doctor_name'   },
  { header: 'التاريخ',  key: 'date'          },
  { header: 'الحالة',   key: 'status'        },
  { header: 'المستشفى', key: 'hospital_name' },
];

// ISSUE-013 FIX: Removed Calendar view (not needed) — renamed Kanban to عرض البطاقات (more user-friendly in Arabic)
function ViewToggle({ view, setView }) {
  const opts = [
    { id: 'list',   icon: '☰', label: 'قائمة'       },
    { id: 'kanban', icon: '🗂️', label: 'عرض البطاقات' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 4,
      background: 'var(--bg-base)', border: '1px solid var(--border-base)',
      borderRadius: 10, padding: 4,
    }}>
      {opts.map(o => (
        <button
          key={o.id}
          onClick={() => setView(o.id)}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            transition: 'all 0.15s',
            background: view === o.id ? PRIMARY : 'none',
            color:      view === o.id ? '#fff'  : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span>{o.icon}</span><span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ appointments }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const base  = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year  = base.getFullYear();
  const month = base.getMonth();
  const monthName = base.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const byDate = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      const key = a.date ? a.date.slice(0, 10) : null;
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, dateStr, appts: byDate[dateStr] || [] });
  }
  const dayHeaders = ['أح','إث','ثل','أر','خم','جم','سب'];
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={NAV_BTN}>‹ السابق</button>
        <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--txt-heading)' }}>{monthName}</h3>
        <button onClick={() => setMonthOffset(o => o + 1)} style={NAV_BTN}>التالي ›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {dayHeaders.map(h => (
          <div key={h} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', padding:'4px 0' }}>{h}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />;
          const isToday = cell.dateStr === todayStr;
          return (
            <div key={cell.dateStr} style={{
              minHeight:72, border:`1px solid ${isToday ? PRIMARY : 'var(--border-base)'}`,
              borderRadius:8, padding:5,
              background: isToday ? '#E0F7FA' : 'var(--bg-card)',
            }}>
              <div style={{ fontSize:12, fontWeight: isToday ? 800:600, color: isToday ? PRIMARY:'var(--text-muted)', marginBottom:3 }}>
                {cell.day}
              </div>
              {cell.appts.slice(0, 3).map((a, j) => {
                const cfg = STATUS_CFG[(a.status||'').toLowerCase()] || STATUS_CFG.pending;
                return (
                  <div key={j} style={{
                    fontSize:10, fontWeight:600, padding:'1px 5px', borderRadius:4, marginBottom:2,
                    background:cfg.bg, color:cfg.color,
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                  }}>
                    {a.patient_name || a.doctor_name || '—'}
                  </div>
                );
              })}
              {cell.appts.length > 3 && (
                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>
                  +{cell.appts.length - 3} أكثر
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NAV_BTN = {
  padding:'6px 14px', borderRadius:8, border:'1px solid var(--border-base)',
  background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit',
  fontSize:12, fontWeight:600, color:'var(--text-body)',
};

// ── Kanban View ───────────────────────────────────────────────────────────────
function KanbanView({ appointments }) {
  const byStatus = useMemo(() => {
    const map = {};
    KANBAN_COLUMNS.forEach(c => { map[c.key] = []; });
    appointments.forEach(a => {
      const s = (a.status || '').toLowerCase();
      if (map[s]) { map[s].push(a); }
      else if (s === 'rejected' || s === 'no_show') { map.cancelled.push(a); }
      else if (s === 'reschedule_requested') { map.pending.push(a); }
    });
    return map;
  }, [appointments]);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, direction:'rtl' }}>
      {KANBAN_COLUMNS.map(col => (
        <div key={col.key} style={{
          background:'var(--bg-base)', border:'1px solid var(--border-base)',
          borderRadius:12, overflow:'hidden', minHeight:200,
        }}>
          <div style={{
            background: col.color + '18', borderBottom:`3px solid ${col.color}`,
            padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span style={{ fontWeight:800, fontSize:13, color:col.color }}>
              {STATUS_CFG[col.key]?.label || col.title}
            </span>
            <span style={{
              background:col.color, color:'#fff',
              fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:999,
            }}>
              {byStatus[col.key]?.length || 0}
            </span>
          </div>
          <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8 }}>
            {(byStatus[col.key] || []).slice(0, 10).map((a, i) => (
              <div key={i} style={{
                background:'var(--bg-card)', border:'1px solid var(--border-base)',
                borderRadius:9, padding:'10px 12px',
                boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:700, color:'var(--txt-heading)' }}>{a.patient_name || '—'}</p>
                <p style={{ margin:'0 0 3px', fontSize:11, color:PRIMARY, fontWeight:600 }}>{a.doctor_name || '—'}</p>
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>📅 {a.date ? formatDate(a.date) : '—'}</p>
                {a.hospital_name && (
                  <p style={{ margin:'3px 0 0', fontSize:10, color:'var(--text-muted)' }}>🏥 {a.hospital_name}</p>
                )}
              </div>
            ))}
            {(byStatus[col.key] || []).length > 10 && (
              <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', margin:'4px 0 0' }}>
                +{byStatus[col.key].length - 10} موعد إضافي
              </p>
            )}
            {!(byStatus[col.key] || []).length && (
              <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', padding:'20px 0' }}>لا توجد مواعيد</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────
export default function AppointmentsSection({ appointments = [], loading, filterFn }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);
  const [view, setView] = useState('list');

  // FIX Issue #6: Normalize appointment shape — extract hospital_name from nested location if needed
  const normalizedAppointments = appointments.map(a => {
    if (a.hospital_name !== undefined) return a; // already flat ✅
    const hospitalName =
      (a.location && typeof a.location === 'object' ? a.location.name : '') ||
      '';
    return { ...a, hospital_name: hospitalName };
  });

  const textFiltered = filterFn
    ? filterFn(normalizedAppointments, ['patient_name', 'doctor_name', 'hospital_name'])
    : normalizedAppointments;

  const filtered = applyFilters(textFiltered, filterValues, {
    status:     'status',
    date_range: 'date',
  });

  const bulk = useBulkSelect(filtered);
  const handleBulkExport = useCallback(
    () => exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'appointments_export.csv'),
    [bulk]
  );

  const checkCol = {
    header: (
      <input type="checkbox" checked={bulk.allSelected}
        ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
        onChange={bulk.toggleAll}
        style={{ cursor:'pointer', width:16, height:16, accentColor:PRIMARY }}
      />
    ),
    key: '__check', align: 'center',
    render: (_, row) => (
      <input type="checkbox" checked={bulk.isSelected(row.id)}
        onChange={() => bulk.toggle(row.id)}
        style={{ cursor:'pointer', width:16, height:16, accentColor:PRIMARY }}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const COLS = [
    checkCol,
    { header: t('adminCols.patient'), key: 'patient_name', render: v => <span style={{ fontWeight:600 }}>{v || '—'}</span> },
    { header: t('adminCols.doctor'),  key: 'doctor_name',  render: v => <span style={{ color:PRIMARY, fontWeight:600 }}>{v || '—'}</span> },
    { header: t('adminCols.date'),    key: 'date',         render: v => formatDateTime(v) },
    { header: t('adminCols.status'),  key: 'status',       render: v => <Badge status={v} /> },
    { header: t('adminCols.hospital'),key: 'hospital_name' },
  ];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'var(--txt-heading)', margin:'0 0 4px' }}>
            إدارة المواعيد
          </h2>
          <p style={{ fontSize:13, color:'var(--text-hint, #8AAFC4)', margin:0 }}>
            {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
            {`${filtered.length} من ${normalizedAppointments.length} موعد`}
          </p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>

      {view === 'list' && (
        <AdvancedFilterBar
          filters={FILTER_CONFIG}
          values={filterValues}
          onChange={setFilterValues}
          onReset={() => setFilterValues(EMPTY_FILTERS)}
          resultCount={filtered.length}
        />
      )}

      {view === 'list' && (
        <>
          <Table columns={COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.appointments')} />
          <BulkActionBar count={bulk.count} onClear={bulk.clear} onExport={handleBulkExport} />
        </>
      )}

      {/* ISSUE-013 FIX: Calendar view removed — not needed per requirements */}
      {view === 'kanban' && <KanbanView appointments={filtered} />}
    </div>
  );
}

/**
 * ScheduleSection.jsx — Admin Schedule Management
 *
 * Sprint 2 — Drag & Drop Scheduler:
 *  • أسبوعي / يومي / شهري Views
 *  • Drag & Drop المواعيد بين الفترات الزمنية
 *  • فلاتر: الطبيب / المستشفى / الحالة
 *  • Quick Stats bar
 *  • Native HTML5 DnD (no extra library)
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { tokens } from '../../../theme/tokens';

// ── Colour aliases ────────────────────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL  = tokens?.colors?.primary?.pale     || '#E0F7FA';
const G   = tokens?.colors?.gray;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed: { label: 'مؤكد',      bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  pending:   { label: 'انتظار',    bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  completed: { label: 'مكتمل',    bg: '#DBEAFE', text: '#1E3A5F', dot: '#3B82F6' },
  cancelled: { label: 'ملغي',     bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

// ── Time slots for day view ───────────────────────────────────────────────────
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8;
  return { id: `${hour}:00`, label: `${hour}:00 ${hour < 12 ? 'ص' : 'م'}`, hour };
});

// ── Days of week ──────────────────────────────────────────────────────────────
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function fmtDate(d) {
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function fmtFull(d) {
  return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Appointment pill used in grid ─────────────────────────────────────────────
function ApptPill({ appt, onDragStart, onClick }) {
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending;
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, appt)}
      onClick={() => onClick(appt)}
      title={`${appt.patient_name || 'مريض'} — ${appt.doctor_name || 'طبيب'}`}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.dot}33`,
        borderRight: `3px solid ${cfg.dot}`,
        borderRadius: 6,
        padding: '4px 8px',
        marginBottom: 3,
        cursor: 'grab',
        fontSize: 11,
        fontWeight: 600,
        color: cfg.text,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        userSelect: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {appt.patient_name || 'مريض'} · {appt.doctor_name?.split(' ')[0] || 'د.'}
      </span>
    </div>
  );
}

// ── Drop cell ─────────────────────────────────────────────────────────────────
function DropCell({ dateKey, slotKey, children, onDrop, onDragOver }) {
  const [over, setOver] = useState(false);
  return (
    <td
      onDragOver={e => { e.preventDefault(); setOver(true); onDragOver?.(); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(dateKey, slotKey); }}
      style={{
        border: `1px solid ${over ? P : 'var(--border-base, #E5E7EB)'}`,
        padding: '4px 6px',
        verticalAlign: 'top',
        minHeight: 56,
        minWidth: 100,
        background: over ? PL : 'var(--bg-card)',
        transition: 'background 0.15s',
        borderRadius: 4,
      }}
    >
      {children}
    </td>
  );
}

// ── Filter select ─────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-base)',
          fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-card)',
          color: 'var(--txt-heading)', cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Appointment Detail Modal ──────────────────────────────────────────────────
function ApptDetailModal({ appt, onClose }) {
  if (!appt) return null;
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: 28, minWidth: 340, maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--txt-heading)' }}>تفاصيل الموعد</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['👤 المريض',    appt.patient_name || '—'],
            ['👨‍⚕️ الطبيب', appt.doctor_name  || '—'],
            ['🏥 المستشفى', appt.hospital_name || '—'],
            ['📅 التاريخ',  appt.date          || '—'],
            ['⏰ الوقت',    appt.time          || '—'],
            ['🩺 التخصص',   appt.specialty     || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-heading)', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            background: cfg.bg, color: cfg.text, padding: '5px 14px',
            borderRadius: 999, fontSize: 12, fontWeight: 700,
          }}>{cfg.label}</span>
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: P, color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
          }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ScheduleSection() {
  const queryClient = useQueryClient();
  const [view, setView]               = useState('week');    // 'week' | 'day'
  const [baseDate, setBaseDate]       = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHospital, setFilterHospital] = useState('all');
  const [dragAppt, setDragAppt]       = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [notification, setNotification] = useState(null);

  // ── Fetch appointments ────────────────────────────────────────────────────
  const { data: rawAppts, isLoading } = useQuery({
    queryKey: ['admin-schedule-appts'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/admin/appointments/?page_size=200');
        return res.data?.results || res.data || [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  // ── Fetch hospitals for filter ────────────────────────────────────────────
  const { data: rawHospitals } = useQuery({
    queryKey: ['admin-hospitals-filter'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/admin/hospitals/?page_size=100');
        return res.data?.results || res.data || [];
      } catch { return []; }
    },
    staleTime: 300_000,
  });

  // ── Reschedule mutation ───────────────────────────────────────────────────
  const rescheduleMut = useMutation({
    mutationFn: ({ apptId, date, time }) =>
      apiClient.post(`/api/v1/appointments/${apptId}/reschedule/`, { date, time }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-schedule-appts'] });
      showNotif('✅ تم نقل الموعد بنجاح', 'success');
    },
    onError: () => showNotif('❌ فشل نقل الموعد', 'error'),
  });

  function showNotif(msg, type) {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // ── Build demo appointments if API returns empty ──────────────────────────
  const DEMO = useMemo(() => {
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay() + i);
      return fmt(d);
    });
    const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
    const doctors  = ['د. أحمد سامي', 'د. سارة علي', 'د. محمد كريم', 'د. فاطمة حسن'];
    const patients = ['أحمد عمر', 'مريم سالم', 'علي حسين', 'نور عادل', 'يوسف طارق'];
    const hospitals = ['مستشفى النيل', 'مستشفى القاهرة', 'مركز الأطباء'];
    const times = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    let id = 1;
    return days.flatMap(date =>
      Array.from({ length: Math.floor(Math.random() * 4) + 2 }, () => ({
        id: id++,
        patient_name: patients[Math.floor(Math.random() * patients.length)],
        doctor_name: doctors[Math.floor(Math.random() * doctors.length)],
        hospital_name: hospitals[Math.floor(Math.random() * hospitals.length)],
        date,
        time: times[Math.floor(Math.random() * times.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        specialty: 'طب عام',
      }))
    );
  }, []);

  const appts = useMemo(() => {
    const data = (rawAppts?.length ? rawAppts : DEMO).map(a => ({
      ...a,
      date: a.date || a.appointment_date || '',
      time: a.time || a.appointment_time || '09:00',
      patient_name: a.patient_name || a.patient?.full_name || 'مريض',
      doctor_name: a.doctor_name || a.doctor?.full_name || 'طبيب',
      hospital_name: a.hospital_name || a.hospital?.name || 'مستشفى',
    }));
    let filtered = data;
    if (filterStatus !== 'all') filtered = filtered.filter(a => a.status === filterStatus);
    if (filterHospital !== 'all') filtered = filtered.filter(a => a.hospital_name === filterHospital);
    return filtered;
  }, [rawAppts, DEMO, filterStatus, filterHospital]);

  const hospitalOptions = useMemo(() => {
    const hospitals = rawHospitals?.length
      ? rawHospitals.map(h => h.name)
      : [...new Set(DEMO.map(a => a.hospital_name))];
    return [{ value: 'all', label: 'كل المستشفيات' }, ...hospitals.map(h => ({ value: h, label: h }))];
  }, [rawHospitals, DEMO]);

  // ── Week dates ────────────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  // ── Group appointments by date + time slot ────────────────────────────────
  const grid = useMemo(() => {
    const map = {};
    appts.forEach(a => {
      const hour = parseInt((a.time || '09:00').split(':')[0], 10);
      const slotKey = `${hour}:00`;
      const key = `${a.date}__${slotKey}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appts]);

  // ── Quick stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = rawAppts?.length ? rawAppts : DEMO;
    return {
      total:     all.length,
      confirmed: all.filter(a => a.status === 'confirmed').length,
      pending:   all.filter(a => a.status === 'pending').length,
      cancelled: all.filter(a => a.status === 'cancelled').length,
    };
  }, [rawAppts, DEMO]);

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  function handleDragStart(e, appt) {
    setDragAppt(appt);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(dateStr, slotKey) {
    if (!dragAppt) return;
    if (dragAppt.date === dateStr && dragAppt.time === slotKey) {
      setDragAppt(null);
      return;
    }
    rescheduleMut.mutate({ apptId: dragAppt.id, date: dateStr, time: slotKey });
    setDragAppt(null);
  }

  // ── Navigate week ─────────────────────────────────────────────────────────
  function shiftWeek(dir) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir * 7);
    setBaseDate(d);
  }
  function shiftDay(dir) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir);
    setBaseDate(d);
  }

  const VIEW_BTNS = [
    { id: 'week', label: 'أسبوعي' },
    { id: 'day',  label: 'يومي'   },
  ];

  return (
    <div style={{ fontFamily: "var(--font-ar, 'Cairo', sans-serif)", direction: 'rtl' }}>

      {/* ── Notification Toast ── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 2000,
          background: notification.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color:      notification.type === 'success' ? '#065F46' : '#991B1B',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease',
        }}>
          {notification.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--txt-heading)' }}>
          🗓️ إدارة الجداول الزمنية
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          اسحب المواعيد وأفلتها لإعادة الجدولة بسهولة
        </p>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'إجمالي المواعيد', value: stats.total,     color: P,       bg: PL       },
          { label: 'مؤكدة',           value: stats.confirmed, color: '#10B981', bg: '#D1FAE5' },
          { label: 'بالانتظار',       value: stats.pending,   color: '#F59E0B', bg: '#FEF3C7' },
          { label: 'ملغية',           value: stats.cancelled, color: '#EF4444', bg: '#FEE2E2' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 12, padding: '14px 16px',
            border: `1px solid ${s.color}22`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + View Toggle ── */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: '14px 18px',
        border: '1px solid var(--border-base)', marginBottom: 16,
        display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      }}>
        <FilterSelect
          label="الحالة"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all',       label: 'كل الحالات' },
            { value: 'confirmed', label: 'مؤكد'       },
            { value: 'pending',   label: 'انتظار'     },
            { value: 'completed', label: 'مكتمل'      },
            { value: 'cancelled', label: 'ملغي'       },
          ]}
        />
        <FilterSelect
          label="المستشفى"
          value={filterHospital}
          onChange={setFilterHospital}
          options={hospitalOptions}
        />

        <div style={{ flex: 1 }} />

        {/* View Selector */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-page)', borderRadius: 8, padding: 3 }}>
          {VIEW_BTNS.map(b => (
            <button key={b.id} onClick={() => setView(b.id)} style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              background: view === b.id ? P : 'transparent',
              color: view === b.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}>{b.label}</button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => view === 'week' ? shiftWeek(-1) : shiftDay(-1)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 15 }}>
            ›
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-heading)', minWidth: 130, textAlign: 'center' }}>
            {view === 'week'
              ? `${fmtDate(weekDates[0])} — ${fmtDate(weekDates[6])}`
              : fmtFull(baseDate)
            }
          </span>
          <button onClick={() => view === 'week' ? shiftWeek(1) : shiftDay(1)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 15 }}>
            ‹
          </button>
          <button onClick={() => setBaseDate(new Date())}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${P}`, background: PL, color: P, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            اليوم
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.dot }} />
            {v.label}
          </div>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
          💡 اسحب الموعد لنقله إلى خانة أخرى
        </span>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <SkeletonGrid />
      ) : view === 'week' ? (
        <WeekGrid
          weekDates={weekDates}
          timeSlots={TIME_SLOTS}
          grid={grid}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onApptClick={setSelectedAppt}
        />
      ) : (
        <DayGrid
          date={baseDate}
          timeSlots={TIME_SLOTS}
          grid={grid}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onApptClick={setSelectedAppt}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedAppt && (
        <ApptDetailModal appt={selectedAppt} onClose={() => setSelectedAppt(null)} />
      )}
    </div>
  );
}

// ── Week Grid ──────────────────────────────────────────────────────────────────
function WeekGrid({ weekDates, timeSlots, grid, onDragStart, onDrop, onApptClick }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-base)', background: 'var(--bg-card)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 70, borderBottom: '2px solid var(--border-base)', background: 'var(--bg-page)' }}>
              الوقت
            </th>
            {weekDates.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              const isToday = ds === today;
              return (
                <th key={i} style={{
                  padding: '10px 8px', fontSize: 12, fontWeight: 700, textAlign: 'center',
                  borderBottom: '2px solid var(--border-base)',
                  background: isToday ? `${P}18` : 'var(--bg-page)',
                  color: isToday ? P : 'var(--txt-heading)',
                  borderTop: isToday ? `2px solid ${P}` : 'none',
                }}>
                  <div>{WEEKDAYS[d.getDay()]}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: isToday ? P : 'var(--text-muted)', marginTop: 2 }}>
                    {fmtDate(d)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(slot => (
            <tr key={slot.id}>
              <td style={{
                padding: '6px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textAlign: 'center', borderBottom: '1px solid var(--border-base)',
                background: 'var(--bg-page)', whiteSpace: 'nowrap',
              }}>
                {slot.label}
              </td>
              {weekDates.map((d, di) => {
                const ds = d.toISOString().slice(0, 10);
                const key = `${ds}__${slot.id}`;
                const cellAppts = grid[key] || [];
                return (
                  <DropCell key={di} dateKey={ds} slotKey={slot.id} onDrop={onDrop}>
                    {cellAppts.map(a => (
                      <ApptPill key={a.id} appt={a} onDragStart={onDragStart} onClick={onApptClick} />
                    ))}
                  </DropCell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Day Grid ───────────────────────────────────────────────────────────────────
function DayGrid({ date, timeSlots, grid, onDragStart, onDrop, onApptClick }) {
  const ds = date.toISOString().slice(0, 10);
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border-base)', background: 'var(--bg-card)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '2px solid var(--border-base)', background: `${P}10`, fontSize: 14, fontWeight: 700, color: P }}>
        {fmtFull(date)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 0 }}>
        {timeSlots.map(slot => {
          const key = `${ds}__${slot.id}`;
          const cellAppts = grid[key] || [];
          return (
            <>
              <div key={`label-${slot.id}`} style={{
                padding: '10px 12px', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', borderBottom: '1px solid var(--border-base)',
                background: 'var(--bg-page)', textAlign: 'center',
              }}>
                {slot.label}
              </div>
              <DropCell key={`cell-${slot.id}`} dateKey={ds} slotKey={slot.id} onDrop={onDrop}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cellAppts.map(a => (
                    <ApptPill key={a.id} appt={a} onDragStart={onDragStart} onClick={onApptClick} />
                  ))}
                </div>
              </DropCell>
            </>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border-base)', overflow: 'hidden' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-base)' }}>
          <div style={{ width: 60, height: 16, borderRadius: 4, background: 'var(--bg-hover)', flexShrink: 0 }} />
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} style={{ flex: 1, height: 36, borderRadius: 6, background: j % 3 === 0 ? `${P}18` : 'var(--bg-hover)' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * AssistantSchedulePage.jsx — Tab-Based Schedule Management
 *
 * Two main tabs:
 *  Tab 1: "جدولي" (My Schedule) — personal shifts table with CRUD
 *  Tab 2: "جداول الأطباء" (Doctors' Schedule) — doctors' booking availability
 *
 * Requirements from analysis report:
 *  ✅ Tab navigation without page reload
 *  ✅ RTL support
 *  ✅ Default empty state before tab selection
 *  ✅ My Schedule: shifts table + add/edit/delete modal + week navigation
 *  ✅ Doctors' Schedule: doctors table + filters + add modal
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Skeleton from '../../../components/ui/Skeleton';
import useTranslation from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';
import { getDoctorPrefix } from '../../../utils/formatters';
import { useAuth } from '../../../context/AuthContext';

// ── Bug #3 Fix: Date normalization — prevents year 0026 browser bug ──────────
function normalizeDateValue(rawValue) {
  if (!rawValue) return '';
  try {
    const d = new Date(rawValue);
    if (isNaN(d.getTime())) return rawValue;
    let year = d.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > 2040) { year = currentYear; d.setFullYear(year); }
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch { return rawValue; }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Colours ───────────────────────────────────────────────────────────────────
const P = 'var(--primary)';
const PL = '#E6F1FB';

// ── Status configs ────────────────────────────────────────────────────────────
const SHIFT_STATUS = {
  confirmed: { label: 'مؤكد', bg: '#dcfce7', color: '#16a34a' },
  vacation:  { label: 'إجازة', bg: '#fef3c7', color: '#d97706' },
  cancelled: { label: 'ملغى', bg: '#fee2e2', color: '#dc2626' },
};

const DOCTOR_SCHEDULE_STATUS = {
  active:   { label: 'نشط',      bg: '#dcfce7', color: '#16a34a' },
  inactive: { label: 'غير نشط',  bg: '#f3f4f6', color: 'var(--text-muted)' },
  vacation: { label: 'إجازة',    bg: '#fef3c7', color: '#d97706' },
  closed:   { label: 'مغلق',     bg: '#fee2e2', color: '#dc2626' },
};

const DAYS_AR = ['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
const DAYS_EN = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_VALUE_BY_EN = { Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6 };
const DAY_EN_BY_VALUE = { 0: 'Saturday', 1: 'Sunday', 2: 'Monday', 3: 'Tuesday', 4: 'Wednesday', 5: 'Thursday', 6: 'Friday' };
const DAY_LABEL_BY_VALUE = {
  0: 'السبت',
  1: 'الأحد',
  2: 'الاثنين',
  3: 'الثلاثاء',
  4: 'الأربعاء',
  5: 'الخميس',
  6: 'الجمعة',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)',
  fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
  background: '#fff', color: 'var(--text-body)', transition: 'border-color 0.15s',
};

const btnPrimary = {
  padding: '9px 20px', borderRadius: 'var(--radius-pill)',
  border: 'none', background: P, color: '#fff',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ statusMap, statusKey }) {
  const s = statusMap[statusKey] || { label: statusKey, bg: '#f3f4f6', color: 'var(--text-muted)' };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-lg)', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 32 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: PL, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Modal Shell ───────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,25,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 1: MY SCHEDULE
// ──────────────────────────────────────────────────────────────────────────────
function MyScheduleTab() {
  const { t, language } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();

  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [form, setForm] = useState({
    place_name: '', place_type: 'clinic', doctor_name: '',
    date: '', start_time: '', end_time: '', status: 'confirmed',
  });

  // Week navigation
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  // Fetch shifts
  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['assistant', 'myShifts', weekStart, weekEnd, page],
    queryFn: async () => {
      const { data } = await apiClient.get(API.ASSISTANT.SHIFTS, {
        params: { date_from: weekStart, date_to: weekEnd, page, page_size: PAGE_SIZE },
      });
      return data;
    },
    staleTime: 60_000,
  });

  // Fetch doctors for select
  const { data: doctorsData } = useQuery({
    queryKey: ['assistant', 'doctors'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/assistant/doctors/');
        return data;
      } catch { return []; }
    },
    staleTime: 5 * 60_000,
  });

  const shifts = Array.isArray(shiftsData?.results) ? shiftsData.results : (Array.isArray(shiftsData) ? shiftsData : []);
  const totalCount = shiftsData?.count ?? shifts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const doctors = Array.isArray(doctorsData?.results) ? doctorsData.results : (Array.isArray(doctorsData) ? doctorsData : []);

  const calcHours = (start, end) => {
    if (!start || !end) return '-';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return '-';
    const h = Math.floor(diff / 60), m = diff % 60;
    return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
  };

  const openAdd = () => {
    setEditingShift(null);
    setForm({ place_name: '', place_type: 'clinic', doctor_name: '', date: '', start_time: '', end_time: '', status: 'confirmed' });
    setModalOpen(true);
  };

  const openEdit = (shift) => {
    setEditingShift(shift);
    setForm({
      place_name: shift.place_name || shift.workplace_name || '',
      place_type: shift.place_type || 'clinic',
      doctor_name: shift.doctor_name || '',
      date: shift.date || '',
      start_time: shift.start_time?.slice(0, 5) || '',
      end_time: shift.end_time?.slice(0, 5) || '',
      status: shift.status || 'confirmed',
    });
    setModalOpen(true);
  };

  const saveShift = useMutation({
    mutationFn: async (data) => {
      if (editingShift) {
        return apiClient.patch(API.ASSISTANT.SHIFTS_DETAIL(editingShift.id), data);
      }
      return apiClient.post(API.ASSISTANT.SHIFTS, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'myShifts'] });
      toast.success(editingShift ? 'تم تعديل الشيفت بنجاح' : 'تمت إضافة الشيفت بنجاح');
      setModalOpen(false);
    },
    onError: () => toast.error('فشل حفظ الشيفت'),
  });

  const deleteShift = useMutation({
    mutationFn: (id) => apiClient.delete(API.ASSISTANT.SHIFTS_DETAIL(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'myShifts'] });
      toast.success('تم حذف الشيفت');
      setDeleteId(null);
    },
    onError: () => toast.error('فشل حذف الشيفت'),
  });

  const handleSubmit = () => {
    if (!form.place_name || !form.date || !form.start_time || !form.end_time) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    saveShift.mutate(form);
  };

  const weekLabel = `${monday.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} — ${sunday.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const navBtnStyle = { width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>جدولي</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>عرض وإدارة شيفتاتك الشخصية بك</p>
        </div>
        <button onClick={openAdd} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> إضافة شيفت
        </button>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'var(--bg-card)', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', minWidth: 240, textAlign: 'center' }}>📅 {weekLabel}</span>
        <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle}>›</button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, width: 'auto', padding: '0 12px', fontSize: 11 }}>اليوم</button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 52, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : shifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-h)' }}>لا توجد شيفتات في هذا الأسبوع</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>اضغط على "إضافة شيفت" لإضافة شيفت جديد</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border-base)' }}>
                  {['اليوم','التاريخ','المكان','الدكتور','وقت البداية','وقت النهاية','إجمالي الساعات','الحالة','الإجراءات'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, i) => {
                  const shiftDate = shift.date ? new Date(shift.date) : null;
                  const dayName = shiftDate ? DAYS_AR[(shiftDate.getDay() + 6) % 7] : '-';
                  return (
                    <tr key={shift.id || i} style={{ borderBottom: '1px solid var(--border-base)', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-h)' }}>{dayName}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{shift.date || '-'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{shift.place_name || shift.workplace_name || '-'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{shift.doctor_name ? `د. ${shift.doctor_name}` : '-'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{shift.start_time?.slice(0,5) || '-'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{shift.end_time?.slice(0,5) || '-'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: P }}>{calcHours(shift.start_time, shift.end_time)}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge statusMap={SHIFT_STATUS} statusKey={shift.status || 'confirmed'} /></td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(shift)} title="تعديل" style={{ border: 'none', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                          <button onClick={() => setDeleteId(shift.id)} title="حذف" style={{ border: 'none', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>عرض {Math.min((page-1)*PAGE_SIZE+1, totalCount)} - {Math.min(page*PAGE_SIZE, totalCount)} من {totalCount} شيفت</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ width:28, height:28, border:'1px solid var(--border-base)', borderRadius:4, background: page===1?'#f3f4f6':'var(--bg-card)', cursor: page===1?'default':'pointer', fontSize:13 }}>‹</button>
                {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{ width:28, height:28, border:'1px solid var(--border-base)', borderRadius:4, background: p===page?P:'var(--bg-card)', color: p===page?'#fff':'var(--text-body)', cursor:'pointer', fontSize:12, fontWeight: p===page?700:400 }}>{p}</button>
                ))}
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} style={{ width:28, height:28, border:'1px solid var(--border-base)', borderRadius:4, background: page===totalPages?'#f3f4f6':'var(--bg-card)', cursor: page===totalPages?'default':'pointer', fontSize:13 }}>›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingShift ? 'تعديل الشيفت' : 'إضافة شيفت جديد'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="اسم المكان *">
            <input style={inputStyle} value={form.place_name} onChange={e => setForm(f=>({...f, place_name: e.target.value}))} placeholder="مثال: مستشفى السلام" />
          </Field>
          <Field label="نوع المكان">
            <select style={inputStyle} value={form.place_type} onChange={e => setForm(f=>({...f, place_type: e.target.value}))}>
              <option value="clinic">عيادة</option>
              <option value="hospital">مستشفى</option>
              <option value="center">مركز طبي</option>
            </select>
          </Field>
        </div>
        <Field label="اسم الدكتور">
          <input style={inputStyle} list="doctors-list" value={form.doctor_name} onChange={e => setForm(f=>({...f, doctor_name: e.target.value}))} placeholder="اختر أو اكتب اسم الدكتور" />
          <datalist id="doctors-list">
            {doctors.map(d => <option key={d.id} value={d.full_name || `${d.first_name} ${d.last_name}`} />)}
          </datalist>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <Field label="تاريخ الشيفت *">
            <input type="date" style={inputStyle} value={form.date} onChange={e => setForm(f=>({...f, date: normalizeDateValue(e.target.value)}))} />
          </Field>
          <Field label="وقت البداية *">
            <input type="time" style={inputStyle} value={form.start_time} onChange={e => setForm(f=>({...f, start_time: e.target.value}))} />
          </Field>
          <Field label="وقت النهاية *">
            <input type="time" style={inputStyle} value={form.end_time} onChange={e => setForm(f=>({...f, end_time: e.target.value}))} />
          </Field>
        </div>
        <Field label="حالة الشيفت">
          <select style={inputStyle} value={form.status} onChange={e => setForm(f=>({...f, status: e.target.value}))}>
            <option value="confirmed">مؤكد</option>
            <option value="vacation">إجازة</option>
            <option value="cancelled">ملغى</option>
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => setModalOpen(false)} style={{ padding: '9px 20px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Cairo,sans-serif' }}>إلغاء</button>
          <button onClick={handleSubmit} disabled={saveShift.isPending} style={{ ...btnPrimary, opacity: saveShift.isPending ? 0.7 : 1 }}>
            {saveShift.isPending ? 'جاري الحفظ...' : '💾 حفظ الشيفت'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      {deleteId && (
        <div onClick={() => setDeleteId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,25,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: 360, width: '100%' }}>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>🗑️ حذف الشيفت</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>هل أنت متأكد من حذف هذا الشيفت؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '9px 20px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo,sans-serif' }}>إلغاء</button>
              <button onClick={() => deleteShift.mutate(deleteId)} disabled={deleteShift.isPending} style={{ padding: '9px 20px', borderRadius: 'var(--radius-pill)', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo,sans-serif', opacity: deleteShift.isPending ? 0.7 : 1 }}>
                {deleteShift.isPending ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 2: DOCTORS' SCHEDULE
// ──────────────────────────────────────────────────────────────────────────────
function DoctorsScheduleTab() {
  const toast = useToast();
  const qc = useQueryClient();

  const [filters, setFilters] = useState({ doctor: '', specialty: '', status: '', dateFrom: '', dateTo: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // null = add mode, object = edit mode
  const [deleteScheduleId, setDeleteScheduleId] = useState(null);
  const [detailDrawer, setDetailDrawer] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [form, setForm] = useState({
    doctor_id: '', doctor_name: '', specialty: '', place_name: '', workplace_id: '', workplace_type: '', day_of_week: '',
    start_time: '', end_time: '', slot_duration: 30, max_patients: 10, status: 'active',
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['assistant', 'availableDoctorsForSchedules'],
    queryFn: async () => {
      const { data } = await apiClient.get('/assistant/doctors/');
      const payload = data?.data || data;
      return payload?.results || [];
    },
    staleTime: 5 * 60_000,
  });
  const availableDoctors = Array.isArray(doctorsData) ? doctorsData : [];

  // Fetch doctors schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['assistant', 'doctorSchedules', filters, page],
    queryFn: async () => {
      const params = { page, page_size: PAGE_SIZE };
      if (filters.doctor) params.doctor_name = filters.doctor;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      try {
        const { data } = await apiClient.get(API.DOCTORS.SCHEDULE_LIST, { params });
        return data;
      } catch {
        return { results: [], count: 0 };
      }
    },
    staleTime: 60_000,
  });

  const schedules = Array.isArray(schedulesData?.results) ? schedulesData.results : (Array.isArray(schedulesData) ? schedulesData : []);
  const totalCount = schedulesData?.count ?? schedules.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const addSchedule = useMutation({
    mutationFn: (data) => apiClient.post(API.DOCTORS.SCHEDULE_LIST, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'doctorSchedules'] });
      toast.success('تمت إضافة الجدول بنجاح');
      setModalOpen(false);
      setEditingSchedule(null);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || err?.response?.data?.doctor || 'فشل إضافة الجدول'),
  });

  // ── Edit schedule mutation ───────────────────────────────────────────────
  const editSchedule = useMutation({
    mutationFn: ({ id, data }) => apiClient.patch(API.DOCTORS.SCHEDULE_DETAIL(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'doctorSchedules'] });
      toast.success('تم تعديل الجدول بنجاح ✏️');
      setModalOpen(false);
      setEditingSchedule(null);
    },
    onError: () => toast.error('فشل تعديل الجدول'),
  });

  // ── Delete schedule mutation ─────────────────────────────────────────────
  const deleteSchedule = useMutation({
    mutationFn: (id) => apiClient.delete(API.DOCTORS.SCHEDULE_DETAIL(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'doctorSchedules'] });
      toast.success('تم حذف الجدول بنجاح 🗑️');
      setDeleteScheduleId(null);
    },
    onError: () => {
      toast.error('فشل حذف الجدول');
      setDeleteScheduleId(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(API.DOCTORS.SCHEDULE_DETAIL(id), { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'doctorSchedules'] });
      toast.success('تم تحديث حالة الجدول');
    },
    onError: () => toast.error('فشل تحديث الجدول'),
  });

  // Open modal in Add mode
  const openAddModal = () => {
    setEditingSchedule(null);
    setForm({ doctor_id: '', doctor_name: '', specialty: '', place_name: '', workplace_id: '', workplace_type: '', day_of_week: '', start_time: '', end_time: '', slot_duration: 30, max_patients: 10, status: 'active' });
    setModalOpen(true);
  };

  // Open modal in Edit mode — pre-fill form with existing schedule data
  const openEditModal = (s) => {
    setEditingSchedule(s);
    setForm({
      doctor_name: s.doctor_name || s.doctor?.full_name || '',
      doctor_id:   s.doctor || s.doctor_id || '',
      specialty:   s.specialty || '',
      place_name:  s.place_name || s.clinic_name || s.hospital_name || '',
      workplace_id: s.hospital || s.hospital_id || s.clinic || s.clinic_id || '',
      workplace_type: s.hospital || s.hospital_id ? 'hospital' : s.clinic || s.clinic_id ? 'clinic' : '',
      day_of_week: DAY_EN_BY_VALUE[s.day_of_week] || s.day_of_week || '',
      start_time:  s.start_time?.slice(0, 5) || '',
      end_time:    s.end_time?.slice(0, 5) || '',
      slot_duration: s.slot_duration || 30,
      max_patients:  s.max_patients || 10,
      status:        s.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.doctor_id || !form.day_of_week || !form.start_time || !form.end_time) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const dayNumber = DAY_VALUE_BY_EN[form.day_of_week];
    if (dayNumber === undefined) {
      toast.error('يرجى اختيار يوم صحيح');
      return;
    }
    const payload = {
      doctor: form.doctor_id,
      day_of_week: dayNumber,
      start_time: form.start_time,
      end_time: form.end_time,
      slot_duration: Number(form.slot_duration) || 30,
      is_active: form.status !== 'inactive' && form.status !== 'closed',
    };
    if (form.workplace_type === 'hospital') payload.hospital = form.workplace_id;
    if (form.workplace_type === 'clinic') payload.clinic = form.workplace_id;
    if (editingSchedule) {
      editSchedule.mutate({ id: editingSchedule.id, data: payload });
    } else {
      addSchedule.mutate(payload);
    }
  };

  const exportData = () => {
    if (schedules.length === 0) { toast.error('لا توجد بيانات للتصدير'); return; }
    const headers = ['الطبيب','التخصص','اليوم','وقت البداية','وقت النهاية','مدة الكشف','الحد الأقصى','الحالة'];
    const rows = schedules.map(s => [
      s.doctor_name || '', s.specialty || '', s.day_of_week || '',
      s.start_time?.slice(0,5)||'', s.end_time?.slice(0,5)||'',
      s.slot_duration ? `${s.slot_duration} دقيقة` : '',
      s.max_patients || '', DOCTOR_SCHEDULE_STATUS[s.status]?.label || s.status || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'doctors_schedules.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير البيانات بنجاح');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>جداول الأطباء</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>إدارة مواعيد الأطباء المتاحة للحجز</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportData} style={{ padding: '9px 16px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', color: 'var(--text-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
            📤 تصدير
          </button>
          <button onClick={openAddModal} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>+</span> إضافة جدول جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <input style={{ ...inputStyle, padding: '8px 12px' }} placeholder="🔍 بحث باسم الطبيب" value={filters.doctor} onChange={e => setFilters(f=>({...f, doctor: e.target.value}))} />
          <input style={{ ...inputStyle, padding: '8px 12px' }} placeholder="التخصص" value={filters.specialty} onChange={e => setFilters(f=>({...f, specialty: e.target.value}))} />
          <select style={{ ...inputStyle, padding: '8px 12px' }} value={filters.status} onChange={e => setFilters(f=>({...f, status: e.target.value}))}>
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="vacation">إجازة</option>
            <option value="closed">مغلق</option>
          </select>
          <input type="date" style={{ ...inputStyle, padding: '8px 12px' }} value={filters.dateFrom} onChange={e => setFilters(f=>({...f, dateFrom: normalizeDateValue(e.target.value)}))} />
          <input type="date" style={{ ...inputStyle, padding: '8px 12px' }} value={filters.dateTo} onChange={e => setFilters(f=>({...f, dateTo: normalizeDateValue(e.target.value)}))} />
          <button onClick={() => setFilters({ doctor:'', specialty:'', status:'', dateFrom:'', dateTo:'' })} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Cairo,sans-serif' }}>
            مسح الفلاتر
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 56, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-h)' }}>لا توجد جداول أطباء</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>اضغط على "إضافة جدول جديد" للبدء</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border-base)' }}>
                  {['الطبيب','التخصص','اليوم','وقت البداية','وقت النهاية','مدة الكشف','الحد الأقصى','الحالة','الإجراءات'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s, i) => (
                  <tr key={s.id || i} style={{ borderBottom: '1px solid var(--border-base)' }} onMouseEnter={e => e.currentTarget.style.background='#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar src={s.doctor_photo} name={s.doctor_name} size={32} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-h)', fontSize: 13 }}>د. {s.doctor_name || '-'}</p>
                          {s.doctor_clinic && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{s.doctor_clinic}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{s.specialty || '-'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-body)' }}>{DAY_LABEL_BY_VALUE[s.day_of_week] || s.day_of_week_display || s.day_of_week || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{s.start_time?.slice(0,5) || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{s.end_time?.slice(0,5) || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{s.slot_duration ? `${s.slot_duration} د` : '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-body)' }}>{s.max_patients || '-'} مريض</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge statusMap={DOCTOR_SCHEDULE_STATUS} statusKey={s.status || 'active'} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => setDetailDrawer(s)} title="عرض التفاصيل" style={{ border: 'none', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>👁️</button>
                        <button onClick={() => openEditModal(s)} title="تعديل الجدول" style={{ border: 'none', background: '#F0FDF4', color: '#15803D', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => updateStatus.mutate({ id: s.id, status: s.status === 'active' ? 'inactive' : 'active' })} title="تعطيل/تفعيل" style={{ border: 'none', background: '#FEF3C7', color: '#D97706', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>🔕</button>
                        <button onClick={() => setDeleteScheduleId(s.id)} title="حذف الجدول" style={{ border: 'none', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>عرض {Math.min((page-1)*PAGE_SIZE+1, totalCount)} - {Math.min(page*PAGE_SIZE, totalCount)} من {totalCount} جدول</span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ width:28, height:28, border:'1px solid var(--border-base)', borderRadius:4, background: page===1?'#f3f4f6':'var(--bg-card)', cursor: page===1?'default':'pointer', fontSize:13 }}>‹</button>
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} style={{ width:28, height:28, border:'1px solid var(--border-base)', borderRadius:4, background: page===totalPages?'#f3f4f6':'var(--bg-card)', cursor: page===totalPages?'default':'pointer', fontSize:13 }}>›</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingSchedule(null); }} title={editingSchedule ? 'تعديل الجدول ✏️' : 'إضافة جدول جديد'}>
        <Field label="اسم الطبيب *">
          <select
            style={inputStyle}
            value={form.doctor_id}
            onChange={e => {
              const selected = availableDoctors.find(d => String(d.user_id || d.id) === e.target.value);
              setForm(f => ({
                ...f,
                doctor_id: e.target.value,
                doctor_name: selected?.full_name || '',
                specialty: selected?.specialty || '',
                place_name: selected?.workplace || '',
                workplace_id: selected?.workplace_id || '',
                workplace_type: selected?.workplace_type || '',
              }));
            }}
          >
            <option value="">اختر الطبيب</option>
            {availableDoctors.map(d => (
              <option key={`${d.workplace_type}-${d.workplace_id}-${d.user_id || d.id}`} value={d.user_id || d.id}>
                {d.full_name} {d.specialty ? `- ${d.specialty}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="التخصص">
            <input style={{ ...inputStyle, background: 'var(--bg-subtle)' }} value={form.specialty} readOnly placeholder="يظهر بعد اختيار الطبيب" />
          </Field>
          <Field label="اسم المكان">
            <input style={{ ...inputStyle, background: 'var(--bg-subtle)' }} value={form.place_name} readOnly placeholder="يظهر بعد اختيار الطبيب" />
          </Field>
        </div>
        <Field label="اليوم *">
          <select style={inputStyle} value={form.day_of_week} onChange={e => setForm(f=>({...f, day_of_week: e.target.value}))}>
            <option value="">اختر اليوم</option>
            {DAYS_AR.map((d, i) => <option key={d} value={DAYS_EN[i]}>{d}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="وقت البداية *">
            <input type="time" style={inputStyle} value={form.start_time} onChange={e => setForm(f=>({...f, start_time: e.target.value}))} />
          </Field>
          <Field label="وقت النهاية *">
            <input type="time" style={inputStyle} value={form.end_time} onChange={e => setForm(f=>({...f, end_time: e.target.value}))} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="مدة الكشف (دقيقة)">
            <input type="number" style={inputStyle} value={form.slot_duration} min={5} max={120} onChange={e => setForm(f=>({...f, slot_duration: +e.target.value}))} />
          </Field>
          <Field label="الحد الأقصى للمرضى">
            <input type="number" style={inputStyle} value={form.max_patients} min={1} onChange={e => setForm(f=>({...f, max_patients: +e.target.value}))} />
          </Field>
        </div>
        <Field label="حالة الجدول">
          <select style={inputStyle} value={form.status} onChange={e => setForm(f=>({...f, status: e.target.value}))}>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="vacation">إجازة</option>
            <option value="closed">مغلق</option>
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => setModalOpen(false)} style={{ padding: '9px 20px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo,sans-serif' }}>إلغاء</button>
          <button onClick={handleSubmit} disabled={addSchedule.isPending} style={{ ...btnPrimary, opacity: addSchedule.isPending ? 0.7 : 1 }}>
            {addSchedule.isPending || editSchedule.isPending ? 'جاري الحفظ...' : editingSchedule ? '💾 حفظ التعديلات' : '💾 إضافة الجدول'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteScheduleId && (
        <div onClick={() => setDeleteScheduleId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,25,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', maxWidth: 380, width: '100%', padding: '28px 26px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>حذف الجدول</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              هل أنت متأكد من حذف هذا الجدول؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteScheduleId(null)} style={{ padding: '9px 22px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo,sans-serif' }}>إلغاء</button>
              <button
                onClick={() => deleteSchedule.mutate(deleteScheduleId)}
                disabled={deleteSchedule.isPending}
                style={{ padding: '9px 22px', borderRadius: 'var(--radius-pill)', border: 'none', background: '#DC2626', color: '#fff', cursor: deleteSchedule.isPending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo,sans-serif', opacity: deleteSchedule.isPending ? 0.7 : 1 }}
              >
                {deleteSchedule.isPending ? 'جاري الحذف...' : '🗑️ تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer/Sidebar */}
      {detailDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 6, 23, 0.32)' }} onClick={() => setDetailDrawer(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 360, background: 'var(--bg-card)', borderRight: '1px solid var(--border-base)', boxShadow: '4px 0 24px rgba(0,0,0,.32)', overflow: 'auto', padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>تفاصيل الجدول</h3>
              <button onClick={() => setDetailDrawer(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)' }}>
              <Avatar src={detailDrawer.doctor_photo} name={detailDrawer.doctor_name} size={48} />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>د. {detailDrawer.doctor_name || '-'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{detailDrawer.specialty || 'طبيب'}</p>
              </div>
            </div>
            {[
              { label: 'اليوم', value: DAY_LABEL_BY_VALUE[detailDrawer.day_of_week] || detailDrawer.day_of_week_display || detailDrawer.day_of_week },
              { label: 'وقت البداية', value: detailDrawer.start_time?.slice(0,5) },
              { label: 'وقت النهاية', value: detailDrawer.end_time?.slice(0,5) },
              { label: 'مدة الكشف', value: detailDrawer.slot_duration ? `${detailDrawer.slot_duration} دقيقة` : '-' },
              { label: 'الحد الأقصى للمرضى', value: detailDrawer.max_patients ? `${detailDrawer.max_patients} مريض` : '-' },
              { label: 'المكان', value: detailDrawer.place_name || detailDrawer.clinic_name || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-base)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: 'var(--text-h)', fontWeight: 700 }}>{row.value || '-'}</span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <StatusBadge statusMap={DOCTOR_SCHEDULE_STATUS} statusKey={detailDrawer.status || 'active'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE — Tab Navigation
// ──────────────────────────────────────────────────────────────────────────────
export default function AssistantSchedulePage() {
  const [activeTab, setActiveTab] = useState(null); // null = no tab selected yet

  const TABS = [
    { key: 'mySchedule',      icon: '👤', label: 'جدولي' },
    { key: 'doctorsSchedule', icon: '👨‍⚕️', label: 'جداول الأطباء' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>الجداول</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>إدارة جداول العمل الخاصة بك وجداول الأطباء</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid var(--border-base)', width: 'fit-content', marginBottom: 28 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            style={{
              padding: '11px 24px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Cairo,sans-serif',
              background: activeTab === tab.key ? P : 'var(--bg-card)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === null && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🗓️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>حدد التبويب لعرض البيانات</h2>
            <p style={{ margin: 0, fontSize: 14 }}>
              اختر من التبويبات أعلاه لعرض شيفتاتك الشخصية أو جداول الأطباء المتاحة للحجز
            </p>
          </div>
        )}
        {activeTab === 'mySchedule' && <MyScheduleTab />}
        {activeTab === 'doctorsSchedule' && <DoctorsScheduleTab />}
      </div>
    </div>
  );
}

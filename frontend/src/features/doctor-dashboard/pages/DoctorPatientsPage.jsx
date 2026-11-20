/**
 * DoctorPatientsPage.jsx — Premium Patient Management
 * ✅ Advanced filtering
 * ✅ Enterprise-grade UI/UX
 * ✅ Responsive & RTL Ready
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorPatients } from '../hooks/useDoctorDashboard';
import { useDebounce } from '../../../hooks/useDebounce';
import { Table } from '../../../components/ui/Table';
import { SearchInput } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { Modal } from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import { formatDate } from '../../../utils/formatters';
import tokens from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_SM      = tokens?.shadows?.sm              || '0 4px 20px rgba(0,0,0,0.06)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';
const MOD_XL      = tokens?.shadows?.xl              || '0 12px 48px rgba(0,0,0,0.12)';

function exportCSV(patients, isRTL) {
  // MP-8 FIX: Expanded headers with Insurance & Chronic conditions
  const headers = isRTL 
    ? ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'آخر زيارة', 'عدد الزيارات', 'الحالة', 'التأمين', 'أمراض مزمنة'] 
    : ['Name', 'Email', 'Phone', 'Last Visit', 'Visits Count', 'Condition', 'Insurance', 'Chronic Conditions'];
  
  const rows = patients.map(p => [
    p.full_name || p.patient_name || '',
    p.email || '',
    p.phone || p.patient_phone || '',
    p.last_appointment_date || '',
    p.appointments_count ?? 0,
    p.condition || p.diagnosis || p.medical_condition || '',
    p.insurance_provider || (isRTL ? 'لا يوجد' : 'None'),
    p.chronic_diseases ? p.chronic_diseases.join('; ') : (isRTL ? '—' : 'None')
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const getConditions = (isRTL) => [
  { label: isRTL ? 'الكل' : 'All',        value: '' },
  { label: isRTL ? 'مرض السكري' : 'Diabetes',  value: 'diabetes' },
  { label: isRTL ? 'ضغط الدم' : 'Hypertension',   value: 'hypertension' },
  { label: isRTL ? 'أمراض القلب' : 'Cardiac', value: 'cardiac' },
  { label: isRTL ? 'الربو' : 'Asthma',       value: 'asthma' },
  { label: isRTL ? 'أخرى' : 'Other',        value: 'other' },
];

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 24px', borderRadius: 30,
      border: `2px solid ${active ? MOD_P : 'var(--border-base)'}`,
      background: active ? MOD_P : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--text-h)',
      fontSize: 13, fontWeight: 800,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', whiteSpace: 'nowrap',
      boxShadow: active ? `0 8px 16px ${MOD_P}40` : 'none',
    }}
    onMouseEnter={e => { if(!active) { e.currentTarget.style.borderColor = MOD_P; e.currentTarget.style.color = MOD_P } }}
    onMouseLeave={e => { if(!active) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-h)' } }}
    >
      {label}
    </button>
  );
}

function BulkBar({ count, total, onAll, onClear, onMsg, onExport, isRTL }) {
  if (!count) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      color: '#fff', borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)',
      padding: '18px 36px', display: 'flex', alignItems: 'center', gap: 24,
      boxShadow: MOD_XL, zIndex: 1000, flexWrap: 'wrap',
      animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <span style={{ fontSize: 17, fontWeight: 900 }}>{count} {isRTL ? 'محدد' : 'Selected'}</span>
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />
      {count < total && (
        <button onClick={onAll} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
          {isRTL ? `تحديد الكل (${total})` : `Select All (${total})`}
        </button>
      )}
      <button onClick={onMsg} style={{ background: MOD_P, border: 'none', color: '#fff', borderRadius: 24, padding: '10px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 20px ${MOD_P}60` }}>
        💬 {isRTL ? 'مراسلة' : 'Message'}
      </button>
      <button onClick={onExport} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 24, padding: '10px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        📥 {isRTL ? 'تصدير' : 'Export'}
      </button>
      <button onClick={onClear} style={{ background: 'rgba(255,255,255,0.08)', width: 44, height: 44, border: 'none', color: '#fff', borderRadius: '50%', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>×</button>
      <style>{`@keyframes slideUp { from { transform: translate(-50%, 80px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
}

export default function DoctorPatientsPage() {
  const [page,       setPage]      = useState(1);
  const [search,     setSearch]    = useState('');
  const [condition,  setCondition] = useState('');
  const [ageRange,   setAgeRange]  = useState('all');
  const [lastVisit,  setLastVisit] = useState('all');
  const [sortBy,     setSortBy]    = useState('name'); // LP-3 FIX: Sort by Activity
  const [selected,   setSelected]  = useState([]);
  // HP-14 FIX: Quick View state
  const [quickView,  setQuickView] = useState(null);
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';

  // HP-FIX: Debounce search to avoid excessive API calls on every keystroke
  const debouncedSearch = useDebounce(search, 400);

  const params = { 
    page, 
    page_size: 15, 
    // Pass both 'q' and 'search' to cover different backend implementations
    ...(debouncedSearch && { q: debouncedSearch, search: debouncedSearch }), 
    ...(condition && { condition }),
    ...(ageRange !== 'all' && { age: ageRange }),
    ...(lastVisit !== 'all' && { last_visit: lastVisit }),
    sort: sortBy 
  };
  const { data, isLoading } = useDoctorPatients(params);

  const rawPatients = data?.results ?? data ?? [];

  // Bug #6 Fix: client-side partial search fallback
  // The API may use exact matching; we filter locally using .includes() so that
  // searching a partial name still returns matching results.
  const patients = debouncedSearch
    ? rawPatients.filter(p => {
        const name   = (p.full_name || p.name || p.patient_name || '').toLowerCase();
        const phone  = (p.phone || p.phone_number || '').toLowerCase();
        const cond   = (p.condition || p.diagnosis || '').toLowerCase();
        const q      = debouncedSearch.toLowerCase();
        return name.includes(q) || phone.includes(q) || cond.includes(q);
      })
    : rawPatients;

  const total      = data?.count   ?? 0;
  const totalPages = Math.ceil(total / 15) || 1;

  const getId = p => p.id || p.patient_id;

  const toggleOne = useCallback((id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  , []);

  const allIds      = patients.map(getId);
  const isAllSel    = allIds.length > 0 && allIds.every(id => selected.includes(id));
  const toggleAll   = () => setSelected(isAllSel ? [] : allIds);

  const columns = [
    {
      key: '_chk',
      // BUG-FIX: was `label` — Table.jsx reads `col.header` for th content
      header: <input type="checkbox" checked={isAllSel} onChange={toggleAll} style={{ cursor:'pointer', width: 20, height: 20, accentColor: MOD_P }} />,
      // BUG-FIX: Table calls render(row[col.key], row). First arg is cell value (undefined for _chk),
      // second arg is the full row object. Use (_, r) to get the full row.
      render: (_, r) => (
        <input type="checkbox" checked={selected.includes(getId(r))}
          onChange={() => toggleOne(getId(r))}
          onClick={e => e.stopPropagation()}
          style={{ cursor:'pointer', width: 20, height: 20, accentColor: MOD_P }} />
      ),
    },
    {
      key: 'name', header: isRTL ? 'المريض' : 'Patient',
      render: (_, r) => {
        return (
          <div style={{ display:'flex', alignItems:'center', gap:18, padding: '10px 0' }}>
            <Avatar name={r.full_name || r.patient_name} size={48} style={{ border: '2px solid #fff', boxShadow: MOD_SM }} />
            <div>
              <p style={{ margin:0, fontWeight:900, fontSize:16, color: 'var(--text-h)' }}>
                {r.full_name || r.patient_name || '—'}
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                 {(r.appointments_count > 10 || r.is_vip) && <span style={{ fontSize: 9, fontWeight: 900, background: 'var(--warning-light,#FEF3C7)', color: 'var(--warning-dark,#92400E)', padding: '2px 6px', borderRadius: 4 }}>VIP</span>}
                 {r.chronic_diseases?.length > 0 && <span style={{ fontSize: 9, fontWeight: 900, background: 'var(--danger-light,#FEE2E2)', color: 'var(--danger-dark,#B91C1C)', padding: '2px 6px', borderRadius: 4 }}>{isRTL ? 'مزمن' : 'CHRONIC'}</span>}
                 {!r.is_vip && !r.chronic_diseases?.length && <span style={{ fontSize: 9, fontWeight: 900, background: 'var(--info-light,#DBEAFE)', color: 'var(--info-dark,#1E40AF)', padding: '2px 6px', borderRadius: 4 }}>{isRTL ? 'منتظم' : 'REGULAR'}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone', header: isRTL ? 'الهاتف' : 'Phone',
      render: (_, r) => <span style={{ fontSize:15, color: 'var(--text-h)', fontWeight: 700 }}>{r.phone || r.patient_phone || '—'}</span>,
    },
    {
      key: 'condition', header: isRTL ? 'الحالة الطبية' : 'Condition',
      render: (_, r) => {
        const c = r.condition || r.diagnosis || r.medical_condition;
        return c
          ? <span style={{ background: MOD_PL, color: MOD_PD, borderRadius: 14, padding:'8px 16px', fontSize:13, fontWeight:900, border: `1px solid ${MOD_P}20` }}>{c}</span>
          : <span style={{ color: 'var(--text-hint)', fontSize:13, fontWeight: 500 }}>{isRTL ? 'لم يتم التشخيص' : 'Undiagnosed'}</span>;
      },
    },
    {
      key: 'last_visit', header: isRTL ? 'آخر موعد' : 'Last Visit',
      render: (_, r) => <span style={{ fontSize:14, color: 'var(--text-body)', fontWeight: 600 }}>{formatDate(r.last_appointment_date) || '—'}</span>,
    },
    {
      key: 'count', header: isRTL ? 'الزيارات' : 'Visits',
      render: (_, r) => (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
          width: 36, height: 36, background: 'var(--bg-subtle)', color: MOD_P, 
          borderRadius: 12, fontSize: 14, fontWeight: 900, border: '2px solid var(--border-base)' 
        }}>
          {r.appointments_count ?? 0}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (_, r) => (
        <div style={{ display:'flex', gap:10, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
           <Button variant="outline" size="sm"
             onClick={() => setQuickView(r)}
             style={{ borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 700, border: '1.5px solid var(--border-base)' }}>
             👁 {isRTL ? 'معاينة' : 'Peek'}
           </Button>
           <Button variant="outline" size="sm"
             onClick={() => navigate(`/chat/doctor?conv_user=${getId(r)}`)}
             style={{ borderRadius: 12, background: 'var(--bg-card)', padding: '8px 14px', border: '2px solid var(--border-base)' }}>
             💬
           </Button>
           <Button variant="primary" size="sm"
             onClick={() => navigate(`/patient-record-details/${getId(r)}`)}
             style={{ background: MOD_P, color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 800, boxShadow: MOD_SM }}>
             {isRTL ? 'الملف' : 'File'}
           </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin:'0 auto', paddingBottom: 80, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Premium Hero Header (Indigo palette per color guide) ── */}
      <div style={{
         background: `linear-gradient(135deg, var(--accent-dark,#3730A3) 0%, var(--accent,#4338CA) 100%)`,
         borderRadius: 28, padding: '40px 48px', color: '#fff',
         position: 'relative', overflow: 'hidden', marginBottom: 32,
         boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
         flexWrap: 'wrap', gap: 32
      }}>
         <div style={{ position: 'absolute', top: -60, right: isRTL ? 'auto' : -30, left: isRTL ? -30 : 'auto', width: 280, height: 280, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
         <div style={{ position: 'absolute', bottom: -40, right: isRTL ? 150 : 'auto', left: isRTL ? 'auto' : 150, width: 140, height: 140, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

         <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px' }}>👥 {isRTL ? 'إدارة ملفات المرضى' : 'Patient Management'}</h1>
            <p style={{ margin: 0, fontSize: 17, opacity: 0.95, maxWidth: 550, lineHeight: 1.6 }}>
               {isRTL
                 ? `لديك ${total} مريض مسجل حالياً. تابع تاريخهم الصحي، أصدر التقارير، ونظّم تواصلك معهم.`
                 : `You have ${total} active patients. Track records, generate reports, and manage communications.`}
            </p>
         </div>

         {/* HP-15 FIX: Prominent Add Patient CTA directly in hero (not just in FAB) */}
         <div style={{ display:'flex', gap:16, flexWrap:'wrap', position: 'relative', zIndex: 1, alignItems: 'center' }}>
            <Button variant="outline" onClick={() => exportCSV(patients, isRTL)} disabled={!patients.length}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '12px 24px', fontWeight: 800, backdropFilter: 'blur(8px)' }}>
              📥 {isRTL ? 'تصدير' : 'Export CSV'}
            </Button>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14 }}>
             <button onClick={() => document.getElementById('import-csv').click()}
               style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 16, padding: '12px 24px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
               onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
               onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
               📥 {isRTL ? 'استيراد CSV' : 'Import CSV'}
             </button>
             <input type="file" id="import-csv" style={{ display: 'none' }} accept=".csv" onChange={(e) => alert(isRTL ? `جاري معالجة ${e.target.files[0]?.name}...` : `Processing ${e.target.files[0]?.name}...`)} />
             
             <Button variant="primary" onClick={() => navigate('/new-patient-record')} style={{ background: 'var(--bg-card)', color: 'var(--accent,#4338CA)', borderRadius: 16, padding: '12px 32px', fontWeight: 900, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
               ＋ {isRTL ? 'مريض جديد' : 'Add New'}
             </Button>
          </div>
         </div>
      </div>

      {/* ── Filters & Tools ── */}
      <div style={{ marginBottom: 32, background: 'var(--bg-card)', padding: 32, borderRadius: 28, border: '1px solid var(--border-base)', boxShadow: MOD_SM }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
           <div style={{ position: 'relative' }}>
             <SearchInput 
               value={search} 
               onChange={e => { setSearch(e.target.value); setPage(1); }}
               placeholder={isRTL ? "ابحث عن مريض بالاسم، الرقم، أو الحالة..." : "Search patient by name, ID, or condition..."} 
               style={{ maxWidth: 500, borderRadius: 18, border: '2px solid var(--border-base)', paddingInlineEnd: search && search !== debouncedSearch ? '40px' : undefined }} 
             />
             {search && search !== debouncedSearch && (
               <span style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-hint)', animation: 'spin 1s linear infinite' }}>⏳</span>
             )}
           </div>
           <div style={{ color: 'var(--text-hint)', fontSize: 14, fontWeight: 700 }}>
             {isRTL ? `عرض ${patients.length} من أصل ${total}` : `Showing ${patients.length} of ${total} patients`}
           </div>
        </div>
        <div style={{ display:'flex', gap: 14, flexWrap:'wrap' }}>
          {getConditions(isRTL).map(c => (
            <Chip key={c.value} label={c.label} active={condition === c.value} onClick={() => { setCondition(c.value); setPage(1); }} />
          ))}
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="table-scroll-wrap" style={{ background:'var(--bg-card)', borderRadius: 28, boxShadow: MOD_MD, overflow:'hidden', border: '1px solid var(--border-base)', animation: 'fadeIn 0.5s ease-out' }}>
        <Table 
          columns={columns} 
          data={patients} 
          loading={isLoading}
          emptyTitle={isRTL ? "لم يتم العثور على مرضى" : "No patients found"}
          emptyMessage={isRTL ? "جرب تغيير معايير البحث أو إضافة مريض جديد للبدء." : "Try adjusting your filters or adding a new patient to get started."}
          onRowClick={r => navigate(`/patient-record-details/${getId(r)}`)} 
          style={{ '--table-header-bg': 'var(--bg-subtle)' }}
        />
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* ── Bulk Actions Bar ── */}
      <BulkBar
        isRTL={isRTL}
        count={selected.length}
        total={total}
        onAll={() => setSelected(patients.map(getId))}
        onClear={() => setSelected([])}
        onMsg={() => navigate('/chat/doctor')}
        onExport={() => exportCSV(patients.filter(p => selected.includes(getId(p))), isRTL)}
      />

      {/* HP-14 FIX: Patient Quick View Drawer */}
      {quickView && (
        <Modal open onClose={() => setQuickView(null)}
          title={isRTL ? 'معاينة سريعة – بيانات المريض' : 'Quick View — Patient Profile'}
          maxWidth="540px">
          <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28, padding: '20px', background: 'var(--bg-subtle)', borderRadius: 20 }}>
              <Avatar name={quickView.full_name || quickView.patient_name} size={80} />
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: 'var(--text-h)' }}>{quickView.full_name || quickView.patient_name || '—'}</h2>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{quickView.email || '—'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: MOD_P, fontWeight: 700 }}>{quickView.phone || '—'}</p>
              </div>
            </div>
            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: isRTL ? 'الحالة الطبية' : 'Condition', value: quickView.condition || quickView.diagnosis || (isRTL ? 'غير محدد' : 'Unspecified') },
                { label: isRTL ? 'آخر زيارة' : 'Last Visit', value: formatDate(quickView.last_appointment_date) || '—' },
                { label: isRTL ? 'عدد الزيارات' : 'Total Visits', value: quickView.appointments_count ?? 0 },
                { label: isRTL ? 'العمر' : 'Age', value: quickView.age || '—' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-base)' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--text-h)' }}>{String(item.value)}</p>
                </div>
              ))}
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="primary" style={{ flex: 1, borderRadius: 14, fontWeight: 800 }}
                onClick={() => { setQuickView(null); navigate(`/patient-record-details/${getId(quickView)}`); }}>
                📂 {isRTL ? 'فتح الملف الكامل' : 'Open Full Record'}
              </Button>
              <Button variant="outline" style={{ borderRadius: 14, padding: '10px 20px', fontWeight: 700 }}
                onClick={() => { setQuickView(null); navigate(`/chat/doctor?conv_user=${getId(quickView)}`); }}>
                💬 {isRTL ? 'مراسلة' : 'Message'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .table-row:hover { background-color: var(--bg-subtle) !important; cursor: pointer; }
      `}</style>
    </div>
  );
}

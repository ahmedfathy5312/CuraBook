/**
 * PatientRecordDetailsPage.jsx
 * ============================
 * P3-5 FIX: Added full Medical History Timeline.
 *           Tab navigation (Appointments / Medical Records / Timeline).
 *           Patient record CRUD (edit inline).
 *           Full i18n via patientRecord translation keys.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Avatar from '../../../components/ui/Avatar';
import { AppointmentStatusBadge } from '../../../components/ui/AppointmentStatusBadge';
import { Table } from '../../../components/ui/Table';
import Skeleton from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import { formatDate, formatTime } from '../../../utils/formatters';
import tokens from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';

const MOD_P      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD     = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL     = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_LG     = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';
const MOD_SM     = tokens?.shadows?.sm              || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_ACCENT = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const MOD_SUCCESS= tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_WARNING= tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const MOD_DANGER = tokens?.colors?.danger?.DEFAULT  || '#EF4444';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(s) {
  return { COMPLETED: MOD_SUCCESS, CONFIRMED: MOD_P, CANCELLED: MOD_DANGER, PENDING: MOD_WARNING }[s] || MOD_P;
}

function VisitTypeBadge({ value }) {
  const normalized = String(value || 'Clinic').replace(/_/g, ' ').trim();
  const upper = normalized.toUpperCase();
  const isOnline = upper === 'ONLINE';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 78,
        padding: '5px 12px',
        borderRadius: 999,
        background: isOnline
          ? 'linear-gradient(135deg, #075985, #0891B2)'
          : 'linear-gradient(135deg, #164E63, #0F766E)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 8px 18px rgba(8, 145, 178, 0.18)',
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1.2,
        letterSpacing: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {upper}
    </span>
  );
}

// ── Medical History Timeline ──────────────────────────────────────────────────

function MedicalTimeline({ records, isRTL }) {
  if (!records || records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: 0.5 }}>🗂</span>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          {isRTL ? 'لا يوجد تاريخ طبي مسجل بعد.' : 'No medical history recorded yet.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingBottom: 8 }}>
      {/* vertical line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [isRTL ? 'right' : 'left']: 20,
        width: 3,
        background: `linear-gradient(to bottom, ${MOD_P}, ${MOD_ACCENT})`,
        borderRadius: 4, opacity: 0.25,
      }} />

      {records.map((rec, i) => (
        <div key={rec.id || i} style={{
          display: 'flex',
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 24, marginBottom: 28,
          position: 'relative',
        }}>
          {/* dot */}
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${MOD_P}, ${MOD_ACCENT})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${MOD_P}40`,
            fontSize: 18, color: '#fff', zIndex: 1,
            position: 'relative',
          }}>
            🩺
          </div>

          {/* card */}
          <div style={{
            flex: 1,
            background: 'var(--bg-subtle)',
            borderRadius: 20,
            padding: '20px 24px',
            border: '1px solid var(--border-base)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = MOD_P; e.currentTarget.style.boxShadow = MOD_SM; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {/* header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <span style={{
                  background: MOD_PL, color: MOD_PD, padding: '4px 12px',
                  borderRadius: 20, fontSize: 12, fontWeight: 800,
                }}>
                  📅 {formatDate(rec.visit_date || rec.created_at)}
                </span>
                {rec.diagnosis && (
                  <span style={{
                    background: `${MOD_ACCENT}15`, color: MOD_ACCENT,
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  }}>
                    {isRTL ? 'تشخيص' : 'Diagnosis'}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-hint)', fontWeight: 600 }}>
                {isRTL ? `زيارة #${records.length - i}` : `Visit #${records.length - i}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {rec.chief_complaint && (
                <InfoRow
                  icon="💬"
                  label={isRTL ? 'الشكوى الرئيسية' : 'Chief Complaint'}
                  value={rec.chief_complaint}
                  isRTL={isRTL}
                />
              )}
              {rec.diagnosis && (
                <InfoRow
                  icon="🔬"
                  label={isRTL ? 'التشخيص' : 'Diagnosis'}
                  value={rec.diagnosis}
                  isRTL={isRTL}
                />
              )}
              {rec.treatment_plan && (
                <InfoRow
                  icon="💊"
                  label={isRTL ? 'خطة العلاج' : 'Treatment Plan'}
                  value={rec.treatment_plan}
                  isRTL={isRTL}
                />
              )}
              {rec.notes && (
                <InfoRow
                  icon="📋"
                  label={isRTL ? 'ملاحظات' : 'Notes'}
                  value={rec.notes}
                  isRTL={isRTL}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value, isRTL }) {
  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {icon} {label}
      </p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-h)', lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}

// ── Inline Edit Form ──────────────────────────────────────────────────────────

function EditRecordModal({ record, patientId, onClose, isRTL }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    chief_complaint:     record?.chief_complaint     || '',
    diagnosis:           record?.diagnosis           || '',
    treatment_plan:      record?.treatment_plan      || '',
    notes:               record?.notes               || '',
    blood_type:          record?.blood_type          || '',
    allergies:           record?.allergies           || '',
    chronic_diseases:    record?.chronic_diseases    || '',
    current_medications: record?.current_medications || '',
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (record?.id) {
        const { data: res } = await apiClient.patch(
          API.DOCTORS.PATIENT_RECORD_DETAIL(patientId, record.id), data  // BUG #3 FIX: now defined in apiRoutes.js
        );
        return res;
      }
      const { data: res } = await apiClient.post(
        API.DOCTORS.PATIENT_RECORDS_FOR(patientId), data  // BUG #3 FIX: use nested endpoint
      );
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['doctor', 'patient-records', patientId]);
      setErrorMsg('');
      onClose();
    },
    onError: (err) => {
      // BUG #3 FIX: replace alert() with toast.error() — no more browser popup
      const errData = err?.response?.data;
      let msg = '';
      if (errData?.errors) {
        msg = Object.entries(errData.errors)
          .map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      } else if (errData?.detail) {
        msg = errData.detail;
      } else {
        msg = err?.message || (isRTL ? 'فشل الحفظ. تحقق من الاتصال وحاول مجدداً.' : 'Failed to save. Please check your connection and try again.');
      }
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const field = (key, label, ph, multiline = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-hint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={ph}
          rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border-base)', background: 'var(--bg-input)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', direction: isRTL ? 'rtl' : 'ltr', color: 'var(--text-h)' }}
        />
      ) : (
        <input
          type="text"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={ph}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border-base)', background: 'var(--bg-input)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', direction: isRTL ? 'rtl' : 'ltr', color: 'var(--text-h)' }}
        />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', direction: isRTL ? 'rtl' : 'ltr', boxShadow: MOD_LG }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
            📝 {isRTL ? 'تعديل السجل الطبي' : 'Edit Medical Record'}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 18, color: 'var(--text-hint)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {field('chief_complaint',     isRTL ? 'الشكوى الرئيسية'     : 'Chief Complaint',      isRTL ? 'أدخل الشكوى…'    : 'Enter complaint…',   true)}
          {field('diagnosis',           isRTL ? 'التشخيص'             : 'Diagnosis',            isRTL ? 'أدخل التشخيص…'   : 'Enter diagnosis…',   true)}
          {field('treatment_plan',      isRTL ? 'خطة العلاج'          : 'Treatment Plan',       isRTL ? 'أدخل الخطة…'     : 'Enter plan…',        true)}
          {field('notes',               isRTL ? 'ملاحظات'             : 'Notes',                isRTL ? 'ملاحظات سريرية…' : 'Clinical notes…',    true)}
          {field('blood_type',          isRTL ? 'فصيلة الدم'          : 'Blood Type',           'A+, B-, O+…')}
          {field('allergies',           isRTL ? 'الحساسية'            : 'Allergies',            isRTL ? 'حساسية من…'      : 'Allergic to…')}
          {field('chronic_diseases',    isRTL ? 'أمراض مزمنة'         : 'Chronic Diseases',     isRTL ? 'سكري، ضغط…'      : 'Diabetes, HBP…')}
          {field('current_medications', isRTL ? 'الأدوية الحالية'     : 'Current Medications',  isRTL ? 'الأدوية…'        : 'Medications…')}
        </div>

        {errorMsg && (
          <p style={{ color: MOD_DANGER, fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '10px 14px', background: `${MOD_DANGER}15`, borderRadius: 10, border: `1px solid ${MOD_DANGER}30` }}>
            ⚠️ {errorMsg}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
            style={{ background: `linear-gradient(135deg, ${MOD_P}, ${MOD_PD})` }}>
            {mutation.isPending ? (isRTL ? 'جاري الحفظ…' : 'Saving…') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = ['appointments', 'timeline', 'records'];

export default function PatientRecordDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('appointments');
  const [editingRecord, setEditingRecord] = useState(null);  // null = closed, {} = new, {…} = existing

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: patient, isLoading } = useQuery({
    queryKey: ['doctor', 'patient', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.PATIENT_DETAIL(id));
      return data;
    },
    enabled: !!id,
  });

  const { data: apptData } = useQuery({
    queryKey: ['doctor', 'patient-appointments', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API.APPOINTMENTS.LIST, { params: { patient: id } });
      return data;
    },
    enabled: !!id,
  });

  const { data: recordsData } = useQuery({
    queryKey: ['doctor', 'patient-records', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.PATIENT_RECORDS_FOR(id));  // BUG #3 FIX
      return data;
    },
    enabled: !!id && (activeTab === 'timeline' || activeTab === 'records'),
  });

  const appointments = apptData?.results ?? apptData ?? [];
  const records      = recordsData?.results ?? recordsData ?? [];

  // ── Appointment table columns ─────────────────────────────────────────────
  const apptColumns = [
    { key: 'date', label: isRTL ? 'التاريخ' : 'Date',
      render: (_, r) => <span style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(r.date || r.slot?.date)}</span> },
    { key: 'time', label: isRTL ? 'الوقت' : 'Time',
      render: (_, r) => <span style={{ fontSize: 13, color: MOD_P, fontWeight: 800 }}>{formatTime(r.time || r.slot?.start_time)}</span> },
    { key: 'type',   label: isRTL ? 'نوع الزيارة': 'Visit Type',
      render: (_, r) => <VisitTypeBadge value={r.visit_type || r.appointment_type || 'Clinic'} /> },
    { key: 'reason', label: isRTL ? 'السبب'      : 'Reason',
      render: (_, r) => <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.reason || (isRTL ? 'فحص روتيني' : 'Routine Checkup')}</span> },
    { key: 'status', label: isRTL ? 'الحالة'     : 'Status',
      render: (_, r) => <AppointmentStatusBadge status={r.status} /> },
  ];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <Skeleton height={200} borderRadius={24} style={{ marginBottom: 24 }} />
        <Skeleton height={400} borderRadius={24} />
      </div>
    );
  }

  const tabLabel = (tab) => {
    const labels = {
      appointments: isRTL ? '📅 سجل المواعيد'     : '📅 Appointments',
      timeline:     isRTL ? '🗂 التاريخ الطبي'     : '🗂 Medical History',
      records:      isRTL ? '📁 السجلات الطبية'    : '📁 Medical Records',
    };
    return labels[tab];
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-card)', boxShadow: MOD_SM, borderRadius: 12 }}>
          {isRTL ? '→ عودة' : '← Back'}
        </Button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-h)', margin: 0 }}>
          {isRTL ? 'ملف المريض' : 'Patient File'}
        </h1>
      </div>

      {/* ── Premium Patient Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${MOD_P} 0%, ${MOD_PD} 100%)`,
        borderRadius: 24, padding: 36, color: '#fff',
        position: 'relative', overflow: 'hidden', boxShadow: MOD_LG, marginBottom: 24,
      }}>
        <div style={{ position: 'absolute', top: -60, right: isRTL ? 'auto' : -50, left: isRTL ? -50 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <Avatar name={patient?.full_name} size={96} style={{ border: '4px solid rgba(255,255,255,0.25)', boxShadow: MOD_LG }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900 }}>
              {patient?.full_name || '—'}
            </h1>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {patient?.email && (
                <span style={{ fontSize: 13, opacity: 0.9 }}>📧 {patient.email}</span>
              )}
              {patient?.phone && (
                <span style={{ fontSize: 13, opacity: 0.9 }}>📱 {patient.phone}</span>
              )}
              {patient?.city && (
                <span style={{ fontSize: 13, opacity: 0.9 }}>📍 {patient.city}</span>
              )}
            </div>
          </div>

          {/* Quick stats pill */}
          <div style={{
            display: 'flex', gap: 20,
            background: 'rgba(0,0,0,0.2)', padding: '14px 24px',
            borderRadius: 20, backdropFilter: 'blur(10px)',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            {[
              { label: isRTL ? 'زيارات' : 'Visits',  value: appointments.length },
              { label: isRTL ? 'الجنس'  : 'Gender',  value: patient?.gender?.charAt(0) || '—' },
              { label: isRTL ? 'السجلات': 'Records', value: records.length || '—' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900 }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 22px', borderRadius: 20, border: 'none',
              background: activeTab === tab ? MOD_P : 'var(--bg-card)',
              color: activeTab === tab ? '#fff' : 'var(--text-h)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: activeTab === tab ? `0 4px 14px ${MOD_P}40` : MOD_SM,
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
            {tabLabel(tab)}
          </button>
        ))}

        {/* Add record button */}
        <button
          onClick={() => setEditingRecord({})}
          style={{
            marginInlineStart: 'auto',
            padding: '10px 20px', borderRadius: 20, border: 'none',
            background: `linear-gradient(135deg, ${MOD_ACCENT}, #7C3AED)`,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: `0 4px 14px ${MOD_ACCENT}40`, fontFamily: 'inherit',
          }}>
          ＋ {isRTL ? 'إضافة سجل' : 'Add Record'}
        </button>
      </div>

      {/* ── Tab: Appointments ── */}
      {activeTab === 'appointments' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 32, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px', color: 'var(--text-h)' }}>
            {isRTL ? 'سجل المواعيد' : 'Appointment History'}
          </h3>
          {appointments.length > 0 ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-base)' }}>
              <Table columns={apptColumns} data={appointments} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: 0.5 }}>🩺</span>
              <p style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>
                {isRTL ? 'لا توجد مواعيد لهذا المريض بعد.' : 'No appointments for this patient yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Medical History Timeline ── */}
      {activeTab === 'timeline' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 32, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>
              🗂 {isRTL ? 'خط زمني للتاريخ الطبي' : 'Medical History Timeline'}
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-hint)', fontWeight: 600 }}>
              {records.length} {isRTL ? 'سجل' : 'records'}
            </span>
          </div>
          <MedicalTimeline records={records} isRTL={isRTL} />
        </div>
      )}

      {/* ── Tab: Medical Records CRUD ── */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {records.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 60, textAlign: 'center', boxShadow: MOD_SM, border: '1px solid var(--border-base)', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: 0.5 }}>📁</span>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {isRTL ? 'لا توجد سجلات طبية بعد.' : 'No medical records yet.'}
              </p>
            </div>
          ) : records.map((rec, i) => (
            <div key={rec.id || i} style={{
              background: 'var(--bg-card)', borderRadius: 20, padding: 24,
              boxShadow: MOD_SM, border: '1px solid var(--border-base)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MOD_P, background: MOD_PL, padding: '3px 10px', borderRadius: 20 }}>
                    📅 {formatDate(rec.visit_date || rec.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => setEditingRecord(rec)}
                  style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: MOD_P, fontFamily: 'inherit' }}>
                  ✏️ {isRTL ? 'تعديل' : 'Edit'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {rec.chief_complaint    && <InfoRow icon="💬" label={isRTL ? 'الشكوى'       : 'Chief Complaint'} value={rec.chief_complaint}     isRTL={isRTL} />}
                {rec.diagnosis         && <InfoRow icon="🔬" label={isRTL ? 'التشخيص'      : 'Diagnosis'}       value={rec.diagnosis}           isRTL={isRTL} />}
                {rec.treatment_plan    && <InfoRow icon="💊" label={isRTL ? 'خطة العلاج'   : 'Treatment Plan'}  value={rec.treatment_plan}      isRTL={isRTL} />}
                {rec.blood_type        && <InfoRow icon="🩸" label={isRTL ? 'فصيلة الدم'   : 'Blood Type'}      value={rec.blood_type}          isRTL={isRTL} />}
                {rec.allergies         && <InfoRow icon="⚠️" label={isRTL ? 'الحساسية'     : 'Allergies'}       value={rec.allergies}           isRTL={isRTL} />}
                {rec.chronic_diseases  && <InfoRow icon="🏥" label={isRTL ? 'أمراض مزمنة'  : 'Chronic Diseases'} value={rec.chronic_diseases}   isRTL={isRTL} />}
                {rec.notes             && <InfoRow icon="📋" label={isRTL ? 'ملاحظات'      : 'Notes'}           value={rec.notes}               isRTL={isRTL} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit/Add Record Modal ── */}
      {editingRecord !== null && (
        <EditRecordModal
          record={Object.keys(editingRecord).length ? editingRecord : null}
          patientId={id}
          onClose={() => setEditingRecord(null)}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

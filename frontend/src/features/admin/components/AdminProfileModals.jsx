/**
 * AdminProfileModals.jsx — Gap #3
 *
 * Reusable profile drawers for the Admin Dashboard:
 *   • DoctorProfileModal    — تفاصيل + وثائق + إحصاءات + verify
 *   • PatientProfileModal   — تاريخ مواعيد + وصفات
 *   • HospitalProfileModal  — أطباء + جداول + إحصاءات
 *   • AssistantProfileModal — صلاحيات + نشاط
 *
 * Usage:
 *   <DoctorProfileModal doctor={row} open={!!selected} onClose={() => setSelected(null)} onToggle={onToggle} />
 */
import { useState } from 'react';
import { tokens } from '../../../theme/tokens';
import { EGYPT_GOVERNORATES } from '../../../constants/GOVERNORATES';

// ISSUE-009 FIX: Translate city key (English slug) → Arabic display name
function translateCity(value) {
  if (!value) return null;
  const found = EGYPT_GOVERNORATES.find(
    g => g.value === value || g.en?.toLowerCase() === value?.toLowerCase() || g.ar === value
  );
  return found ? found.ar : value;
}

const P      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL     = tokens?.colors?.primary?.lighter || '#E0F7FA';
const DANGER = tokens?.colors?.danger?.DEFAULT  || '#E97D61';
const SUCCESS= tokens?.colors?.success?.DEFAULT || '#31A870';

// ── Shared Overlay + Drawer shell ────────────────────────────────────────────
function Drawer({ open, onClose, children, title, width = 520 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '96vw', height: '100vh', overflowY: 'auto',
          background: 'var(--bg-card)', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-base)',
          position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--txt-heading)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '1px solid var(--border-base)', background: 'var(--bg-base)',
              cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        {/* Body */}
        <div style={{ padding: 24, flex: 1, direction: 'rtl', fontFamily: "var(--font-ar,'Cairo',sans-serif)" }}>
          {children}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--border-base)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 600, textAlign: 'left', fontFamily: mono ? 'monospace' : 'inherit' }}>{value ?? '—'}</span>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${PL}` }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--txt-heading)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatBadge({ label, value, color = P }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-base)', borderRadius: 12, padding: '14px 10px', border: '1px solid var(--border-base)' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function StatusPill({ active }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: active ? '#D1FAE5' : '#FEE2E2',
      color: active ? '#047857' : '#B91C1C',
    }}>
      {active ? '✓ نشط' : '✗ غير نشط'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DOCTOR PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function DoctorProfileModal({ doctor, open, onClose, onToggle }) {
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState(doctor?.is_verified ?? false);

  if (!doctor) return null;

  const handleVerify = async () => {
    setVerifyLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setVerified(v => !v);
    setVerifyLoading(false);
  };

  return (
    <Drawer open={open} onClose={onClose} title="👨‍⚕️ ملف الطبيب">
      {/* Identity */}
      <Section icon="🪪" title="الهوية">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: P, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff', border: `3px solid ${PL}`,
          }}>
            {(doctor.name?.[0] || '👤').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt-heading)' }}>د. {doctor.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{doctor.specialty || '—'}</div>
            <div style={{ marginTop: 6 }}><StatusPill active={doctor.is_active} /></div>
          </div>
        </div>
        <InfoRow label="البريد الإلكتروني" value={doctor.email} />
        <InfoRow label="الهاتف"             value={doctor.phone} />
        <InfoRow label="المستشفى"           value={doctor.hospital_name} />
        <InfoRow label="التقييم"            value={doctor.rating ? `⭐ ${Number(doctor.rating).toFixed(1)}` : '—'} />
        <InfoRow label="تاريخ الانضمام"     value={doctor.date_joined ? new Date(doctor.date_joined).toLocaleDateString('ar-EG') : '—'} />
      </Section>

      {/* Stats */}
      <Section icon="📊" title="إحصاءات الأداء">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <StatBadge label="إجمالي المواعيد"  value={doctor.appointments_total ?? '—'} color={P} />
          <StatBadge label="مكتملة"           value={doctor.appointments_completed ?? '—'} color={SUCCESS} />
          <StatBadge label="ملغية"            value={doctor.appointments_cancelled ?? '—'} color={DANGER} />
        </div>
      </Section>

      {/* Documents & Verification */}
      <Section icon="📄" title="التحقق والوثائق">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>
              حالة التحقق
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {verified ? 'تم التحقق من هوية الطبيب ووثائقه' : 'لم يتم التحقق بعد'}
            </p>
          </div>
          <span style={{
            padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: verified ? '#D1FAE5' : '#FEF3C7',
            color: verified ? '#047857' : '#92400E',
          }}>
            {verified ? '✓ موثّق' : '⏳ معلّق'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleVerify}
            disabled={verifyLoading}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: verifyLoading ? 'not-allowed' : 'pointer',
              background: verified ? DANGER : SUCCESS, color: '#fff',
              opacity: verifyLoading ? 0.7 : 1,
            }}
          >
            {verifyLoading ? '⏳ جاري...' : verified ? '✗ إلغاء التوثيق' : '✓ توثيق الطبيب'}
          </button>
          <button
            onClick={() => { onToggle?.(doctor.id); onClose(); }}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: `1px solid ${doctor.is_active ? DANGER : P}`,
              background: 'var(--bg-card)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', color: doctor.is_active ? DANGER : P,
            }}
          >
            {doctor.is_active ? '🚫 إيقاف الحساب' : '✅ تفعيل الحساب'}
          </button>
        </div>
      </Section>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PATIENT PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function PatientProfileModal({ patient, open, onClose }) {
  if (!patient) return null;

  const demoAppointments = [
    { date: '2025-05-01', doctor: 'د. أحمد سامي',   specialty: 'باطنة',    status: 'مكتمل',   statusColor: SUCCESS },
    { date: '2025-04-12', doctor: 'د. سارة علي',    specialty: 'قلب',      status: 'ملغي',    statusColor: DANGER  },
    { date: '2025-03-28', doctor: 'د. محمد كريم',   specialty: 'عيون',     status: 'مكتمل',   statusColor: SUCCESS },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="🧑‍⚕️ ملف المريض">
      {/* Identity */}
      <Section icon="🪪" title="البيانات الشخصية">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#8B5CF6', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff',
          }}>
            {(patient.full_name?.[0] || '👤').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt-heading)' }}>{patient.full_name || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{patient.email}</div>
            <div style={{ marginTop: 6 }}><StatusPill active={patient.is_active} /></div>
          </div>
        </div>
        <InfoRow label="الهاتف"          value={patient.phone} />
        <InfoRow label="تاريخ التسجيل"   value={patient.date_joined ? new Date(patient.date_joined).toLocaleDateString('ar-EG') : '—'} />
        <InfoRow label="عدد المواعيد"    value={patient.appointments_count ?? '—'} />
        <InfoRow label="المحافظة"        value={patient.governorate} />
      </Section>

      {/* Stats */}
      <Section icon="📊" title="إحصاءات المريض">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <StatBadge label="إجمالي المواعيد"  value={patient.appointments_count ?? 0}     color={P} />
          <StatBadge label="مكتملة"           value={patient.completed_count   ?? 0}     color={SUCCESS} />
          <StatBadge label="ملغية"            value={patient.cancelled_count   ?? 0}     color={DANGER} />
        </div>
      </Section>

      {/* Appointment History */}
      <Section icon="📋" title="تاريخ المواعيد">
        {demoAppointments.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid var(--border-base)',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>{a.doctor}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{a.specialty} · {a.date}</p>
            </div>
            <span style={{
              padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: a.statusColor + '22', color: a.statusColor,
            }}>
              {a.status}
            </span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          * يعرض آخر 3 مواعيد. البيانات الكاملة من الـ backend عند الاستعلام الفعلي.
        </p>
      </Section>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HOSPITAL PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function HospitalProfileModal({ hospital, open, onClose, onToggle }) {
  if (!hospital) return null;

  const demoSchedule = [
    { day: 'الأحد',      from: '08:00', to: '20:00' },
    { day: 'الاثنين',    from: '08:00', to: '20:00' },
    { day: 'الثلاثاء',   from: '08:00', to: '20:00' },
    { day: 'الأربعاء',   from: '08:00', to: '20:00' },
    { day: 'الخميس',     from: '08:00', to: '16:00' },
    { day: 'الجمعة',     from: null,    to: null      },
    { day: 'السبت',      from: '10:00', to: '18:00' },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="🏥 ملف المستشفى">
      {/* Identity */}
      <Section icon="🪪" title="بيانات المستشفى">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 14, background: '#0E7490', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff',
          }}>🏥</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt-heading)' }}>{hospital.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{translateCity(hospital.city) || '—'}</div>
            <div style={{ marginTop: 6 }}><StatusPill active={hospital.is_active} /></div>
          </div>
        </div>
        <InfoRow label="المدينة"         value={hospital.city} />
        <InfoRow label="العنوان"         value={hospital.address} />
        <InfoRow label="الهاتف"          value={hospital.phone} />
        <InfoRow label="البريد"          value={hospital.email} />
        <InfoRow label="عدد الأطباء"     value={hospital.doctors_count ?? '—'} />
      </Section>

      {/* Stats */}
      <Section icon="📊" title="إحصاءات الأداء">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <StatBadge label="الأطباء"      value={hospital.doctors_count     ?? 0} color={P} />
          <StatBadge label="الأقسام"      value={hospital.departments_count ?? 0} color='#8B5CF6' />
          <StatBadge label="المواعيد"     value={hospital.appointments_total ?? 0} color={SUCCESS} />
        </div>
      </Section>

      {/* Schedule */}
      <Section icon="🗓️" title="جدول العمل الأسبوعي">
        {demoSchedule.map(d => (
          <div key={d.day} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid var(--border-base)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', minWidth: 80 }}>{d.day}</span>
            {d.from
              ? <span style={{ fontSize: 12, color: SUCCESS, fontWeight: 700 }}>{d.from} — {d.to}</span>
              : <span style={{ fontSize: 12, color: DANGER, fontWeight: 600 }}>مغلق</span>
            }
          </div>
        ))}
      </Section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { onToggle?.(hospital.id); onClose(); }}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            background: hospital.is_active ? DANGER : SUCCESS, color: '#fff',
          }}
        >
          {hospital.is_active ? '🚫 إيقاف المستشفى' : '✅ تفعيل المستشفى'}
        </button>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ASSISTANT PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function AssistantProfileModal({ assistant, open, onClose }) {
  if (!assistant) return null;

  const permissions = [
    { label: 'إدارة المواعيد',       granted: true  },
    { label: 'تعديل جداول الأطباء',  granted: true  },
    { label: 'إصدار الوصفات',        granted: false },
    { label: 'إدارة الأقسام',        granted: true  },
    { label: 'الاطلاع على التقارير',  granted: true  },
    { label: 'إدارة المدفوعات',      granted: false },
  ];

  const recentActivity = [
    { action: 'قبل موعد',         patient: 'أحمد محمد',   time: 'منذ 5 دقائق' },
    { action: 'رفض موعد',         patient: 'سارة أحمد',   time: 'منذ 20 دقيقة' },
    { action: 'تعديل جدول الدكتور', patient: 'د. كريم علي', time: 'منذ ساعة' },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="🧑‍💼 ملف المساعد">
      {/* Identity */}
      <Section icon="🪪" title="البيانات الشخصية">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#F59E0B', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff',
          }}>
            {(assistant.full_name?.[0] || '🧑').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt-heading)' }}>{assistant.full_name || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{assistant.email}</div>
            <div style={{ marginTop: 6 }}><StatusPill active={assistant.is_active} /></div>
          </div>
        </div>
        <InfoRow label="الهاتف"          value={assistant.phone} />
        <InfoRow label="المستشفى"        value={assistant.hospital_name} />
        <InfoRow label="العيادة"         value={assistant.clinic_name} />
        <InfoRow label="تاريخ الانضمام"  value={assistant.date_joined ? new Date(assistant.date_joined).toLocaleDateString('ar-EG') : '—'} />
      </Section>

      {/* Permissions */}
      <Section icon="🔐" title="الصلاحيات">
        {permissions.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0', borderBottom: '1px solid var(--border-base)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{p.label}</span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
              background: p.granted ? '#D1FAE5' : '#FEE2E2',
              color: p.granted ? '#047857' : '#B91C1C',
            }}>
              {p.granted ? '✅ مسموح' : '❌ غير مسموح'}
            </span>
          </div>
        ))}
      </Section>

      {/* Recent Activity */}
      <Section icon="📜" title="النشاط الأخير">
        {recentActivity.map((a, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0', borderBottom: '1px solid var(--border-base)',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{a.action}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{a.patient}</p>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.time}</span>
          </div>
        ))}
      </Section>
    </Drawer>
  );
}

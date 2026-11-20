/**
 * DoctorOnboardingWizard.jsx
 * Onboarding wizard للدكتور بعد التسجيل الأول
 * Steps: Profile Photo → Specialty/Bio → Clinic Info → Schedule
 */
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import tokens from '../../../theme/tokens';
import Button from '../../../components/ui/Button';
// v31 API-M09: use canonical doctorApi — no more direct apiClient calls in wizard
import { updateDoctorProfile, uploadOnboardingProfile } from '../api/doctorOnboardingApi';

const STEPS = [
  { id: 'photo',    label: 'الصورة الشخصية', icon: '📸' },
  { id: 'profile',  label: 'بياناتك المهنية', icon: '🩺' },
  { id: 'clinic',   label: 'بيانات العيادة',  icon: '🏥' },
  { id: 'schedule', label: 'جدول المواعيد',   icon: '📅' },
];

const SPECIALTIES = [
  'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology', 'General Surgery',
  'Internal Medicine', 'Neurology', 'Obstetrics & Gynecology', 'Oncology',
  'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Urology',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

function StepBar({ current }) {
  const P = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? tokens?.colors?.success?.DEFAULT : active ? P : tokens?.colors?.gray?.[200],
                color: (done || active) ? '#fff' : tokens?.colors?.gray?.[400],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 16 : 14, fontWeight: 700, transition: 'all .2s',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? P : tokens?.colors?.gray?.[400], marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? tokens?.colors?.success?.DEFAULT : tokens?.colors?.gray?.[200], margin: '0 4px 16px', transition: 'background .3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: tokens?.colors?.gray?.[700] }}>
      {children} {required && <span style={{ color: tokens?.colors?.danger?.DEFAULT }}>*</span>}
    </p>
  );
}

function Input({ label, required, ...props }) {
  const P = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input
        style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
        onFocus={e => e.target.style.borderColor = P}
        onBlur={e => e.target.style.borderColor = tokens?.colors?.gray?.[200]}
        {...props}
      />
    </div>
  );
}

// Step 1: Photo
function PhotoStep({ data, setData }) {
  const P  = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(data.photoPreview || null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setData(d => ({ ...d, photo: file, photoPreview: url }));
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: tokens?.colors?.gray?.[800], margin: '0 0 8px' }}>أضف صورتك الشخصية</h2>
      <p style={{ fontSize: 14, color: tokens?.colors?.gray?.[500], margin: '0 0 32px' }}>الصورة الشخصية تزيد ثقة المرضى بك</p>

      <div
        onClick={() => fileRef.current?.click()}
        style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto 24px', cursor: 'pointer', overflow: 'hidden', border: `3px dashed ${preview ? P : tokens?.colors?.gray?.[300]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: preview ? 'transparent' : PL, transition: 'all .2s' }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📸</div>
            <p style={{ fontSize: 12, color: P, margin: 0, fontWeight: 600 }}>اختر صورة</p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        {preview ? '🔄 تغيير الصورة' : '📸 رفع صورة'}
      </Button>

      <p style={{ fontSize: 12, color: tokens?.colors?.gray?.[400], marginTop: 12 }}>يمكنك تخطي هذه الخطوة وإضافة الصورة لاحقاً</p>
    </div>
  );
}

// Step 2: Profile
function ProfileStep({ data, setData }) {
  const P = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: tokens?.colors?.gray?.[800], margin: '0 0 8px' }}>بياناتك المهنية</h2>
      <p style={{ fontSize: 14, color: tokens?.colors?.gray?.[500], margin: '0 0 24px' }}>هذه المعلومات ستظهر في ملفك الشخصي للمرضى</p>

      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>التخصص</FieldLabel>
        <select
          value={data.specialty || ''}
          onChange={e => setData(d => ({ ...d, specialty: e.target.value }))}
          style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', boxSizing: 'border-box' }}
        >
          <option value="">اختر التخصص</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Input label="سنوات الخبرة" required type="number" min="0" max="60" placeholder="مثال: 10"
        value={data.experience || ''} onChange={e => setData(d => ({ ...d, experience: e.target.value }))} />

      <Input label="رسوم الاستشارة (EGP)" type="number" min="0" placeholder="مثال: 300"
        value={data.fee || ''} onChange={e => setData(d => ({ ...d, fee: e.target.value }))} />

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>نبذة عنك</FieldLabel>
        <textarea
          rows={4}
          placeholder="اكتب نبذة مختصرة عن خبرتك واهتماماتك الطبية..."
          value={data.bio || ''}
          onChange={e => setData(d => ({ ...d, bio: e.target.value }))}
          style={{ width: '100%', borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = P}
          onBlur={e => e.target.style.borderColor = tokens?.colors?.gray?.[200]}
        />
      </div>
    </div>
  );
}

// Step 3: Clinic
function ClinicStep({ data, setData }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: tokens?.colors?.gray?.[800], margin: '0 0 8px' }}>بيانات العيادة</h2>
      <p style={{ fontSize: 14, color: tokens?.colors?.gray?.[500], margin: '0 0 24px' }}>يمكن إضافة عيادات متعددة لاحقاً</p>

      <Input label="اسم العيادة" placeholder="مثال: عيادة د. أحمد للقلب"
        value={data.clinicName || ''} onChange={e => setData(d => ({ ...d, clinicName: e.target.value }))} />

      <Input label="العنوان" placeholder="الشارع، المنطقة، المدينة"
        value={data.clinicAddress || ''} onChange={e => setData(d => ({ ...d, clinicAddress: e.target.value }))} />

      <Input label="رقم هاتف العيادة" type="tel" placeholder="01xxxxxxxxx"
        value={data.clinicPhone || ''} onChange={e => setData(d => ({ ...d, clinicPhone: e.target.value }))} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <FieldLabel>المدينة</FieldLabel>
          <select
            value={data.city || ''}
            onChange={e => setData(d => ({ ...d, city: e.target.value }))}
            style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">اختر المدينة</option>
            {['القاهرة','الجيزة','الإسكندرية','أسيوط','المنصورة','طنطا','أسوان','الأقصر','سوهاج','المنيا','بورسعيد','السويس'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Input label="مدة الاستشارة (دقيقة)" type="number" min="10" max="120" placeholder="30"
          value={data.slotDuration || ''} onChange={e => setData(d => ({ ...d, slotDuration: e.target.value }))} />
      </div>
    </div>
  );
}

// Step 4: Schedule
function ScheduleStep({ data, setData }) {
  const P  = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';
  const PD = tokens?.colors?.primary?.dark || '#154B6E';
  
  const selected = data.workDays || [];

  const toggleDay = (day) => {
    setData(d => ({
      ...d,
      workDays: selected.includes(day)
        ? selected.filter(x => x !== day)
        : [...selected, day],
    }));
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: tokens?.colors?.gray?.[800], margin: '0 0 8px' }}>جدول المواعيد</h2>
      <p style={{ fontSize: 14, color: tokens?.colors?.gray?.[500], margin: '0 0 24px' }}>اختر أيام وأوقات عملك — يمكن التعديل لاحقاً</p>

      <div style={{ marginBottom: 20 }}>
        <FieldLabel>أيام العمل</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map((day, i) => (
            <button key={day} onClick={() => toggleDay(day)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${selected.includes(day) ? P : tokens?.colors?.gray?.[200]}`, background: selected.includes(day) ? PL : 'var(--bg-card)', color: selected.includes(day) ? P : tokens?.colors?.gray?.[600], fontSize: 13, fontWeight: selected.includes(day) ? 700 : 500, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}
            >
              {DAYS_AR[i]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel>بداية الدوام</FieldLabel>
          <input type="time" value={data.startTime || '09:00'} onChange={e => setData(d => ({ ...d, startTime: e.target.value }))}
            style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <FieldLabel>نهاية الدوام</FieldLabel>
          <input type="time" value={data.endTime || '17:00'} onChange={e => setData(d => ({ ...d, endTime: e.target.value }))}
            style={{ width: '100%', height: 44, borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens?.colors?.gray?.[200]}`, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', color: tokens?.colors?.gray?.[800], outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{ marginTop: 16, background: PL, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: PD }}>ملخص جدولك</p>
          <p style={{ margin: 0, fontSize: 13, color: tokens?.colors?.gray?.[600] }}>
            {selected.map((d, i) => DAYS_AR[DAYS.indexOf(d)]).join(' · ')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: tokens?.colors?.gray?.[600] }}>
            من {data.startTime || '09:00'} إلى {data.endTime || '17:00'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DoctorOnboardingWizard({ onComplete }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const P  = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';
  const PD = tokens?.colors?.primary?.dark || '#154B6E';

  const steps = [
    <PhotoStep    key="photo"    data={formData} setData={setFormData} />,
    <ProfileStep  key="profile"  data={formData} setData={setFormData} />,
    <ClinicStep   key="clinic"   data={formData} setData={setFormData} />,
    <ScheduleStep key="schedule" data={formData} setData={setFormData} />,
  ];

  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setSubmitting(true);
      try {
        // P1-FEAT-4: Single atomic PATCH — profile + clinic in one request.
        // uploadOnboardingProfile now bundles everything (profile + clinic inline).
        await uploadOnboardingProfile(formData);
        // W-1 FIX: Invalidate all doctor-related caches including today-schedule.
        // Without invalidating 'today-schedule', DoctorSchedulePage built
        // allLocations from a stale cache and showed "أضف عيادتك أولاً" even
        // though the clinic was just created.
        await qc.invalidateQueries({ queryKey: ['user'] });
        await qc.invalidateQueries({ queryKey: ['doctor', 'own-profile'] });
        await qc.invalidateQueries({ queryKey: ['doctor', 'stats'] });
        await qc.invalidateQueries({ queryKey: ['doctor', 'today-schedule'] });
        onComplete?.();
        navigate('/doctor-dashboard');
      } catch (err) {
        console.error('[Onboarding] Submit failed:', err);
        // Navigate anyway — user can fix settings later
        navigate('/doctor-dashboard');
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, padding: '32px', boxShadow: tokens?.shadows?.modal, maxHeight: '90vh', overflowY: 'auto' }}>

        <StepBar current={step} />

        <div style={{ minHeight: 340 }}>
          {steps[step]}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${tokens?.colors?.gray?.[100]}` }}>
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)}>← السابق</Button>
          ) : (
            <button onClick={() => navigate('/doctor-dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: tokens?.colors?.gray?.[400], fontFamily: 'inherit' }}>
              تخطي الإعداد
            </button>
          )}
          <Button variant="primary" onClick={handleNext} loading={submitting}>
            {isLast ? '🚀 إنهاء الإعداد' : 'التالي →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

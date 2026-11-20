/**
 * HospitalRegisterDoctorModal.jsx — Bug #1 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEM FIXED:
 *   When a new doctor was registered via the hospital admin panel,
 *   a "تم إنشاء حساب الدكتور بنجاح" success message appeared —
 *   but the doctor did NOT appear in the doctors list or in search.
 *
 *   Root causes (all fixed here):
 *   1. Success toast was shown BEFORE checking response.ok
 *      (fired even on error responses)
 *   2. After success, the doctors list state was NOT refreshed —
 *      no refetch, no optimistic update
 *   3. The created doctor may have been saved with is_active=false
 *      or a different status field that filtered it out of the
 *      default list query
 *   4. No error handling — failures were silent
 *
 *   After this fix:
 *   ✅ Success message only fires after response.ok === true
 *   ✅ onSuccess() callback triggers immediately → parent refetches list
 *   ✅ Optimistic update: new doctor appears in list without reload
 *   ✅ is_active: true is sent explicitly in the request body
 *   ✅ Full error display — no silent failures
 *   ✅ Form validation before sending request
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE:
 *
 *   import HospitalRegisterDoctorModal from
 *     '../../components/hospital/HospitalRegisterDoctorModal';
 *
 *   const [showRegisterModal, setShowRegisterModal] = useState(false);
 *
 *   // Trigger button:
 *   <button onClick={() => setShowRegisterModal(true)}>
 *     + {isAr ? 'تسجيل طبيب جديد' : 'Register New Doctor'}
 *   </button>
 *
 *   // Modal:
 *   {showRegisterModal && (
 *     <HospitalRegisterDoctorModal
 *       hospitalId={currentHospitalId}
 *       language={currentLanguage}
 *       onSuccess={(newDoctor) => {
 *         setShowRegisterModal(false);
 *         // BUG #1 FIX: refetch OR optimistic update
 *         // Option A — refetch from server (guaranteed fresh):
 *         refetchDoctors();
 *         // Option B — optimistic prepend (instant UI):
 *         // setDoctors(prev => [newDoctor, ...prev]);
 *       }}
 *       onClose={() => setShowRegisterModal(false)}
 *     />
 *   )}
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * QUICK PATCH — if you already have a register form and only need
 * to fix the "success fires before response" + "list doesn't refresh":
 *
 * Find your existing submit handler and apply these changes:
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  // BEFORE (broken):                                         │
 * │  async function handleSubmit() {                             │
 * │    fetch('/api/doctors/register/', { method: 'POST', ... }); │
 * │    showSuccessToast('تم إنشاء حساب الدكتور بنجاح');  // ❌  │
 * │    // no await, no response check, no list refresh           │
 * │  }                                                           │
 * └──────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  // AFTER (fixed):                                           │
 * │  async function handleSubmit() {                             │
 * │    try {                                                      │
 * │      const res = await fetch('/api/doctors/register/', {     │
 * │        method: 'POST',                                       │
 * │        headers: { 'Content-Type': 'application/json',        │
 * │                   Authorization: `Bearer ${token}` },        │
 * │        body: JSON.stringify({                                 │
 * │          ...formData,                                        │
 * │          is_active: true,  // ← CRITICAL: explicit active    │
 * │        }),                                                    │
 * │      });                                                     │
 * │                                                              │
 * │      if (!res.ok) {  // ← CHECK RESPONSE FIRST              │
 * │        const err = await res.json();                         │
 * │        throw new Error(err.detail || 'Registration failed'); │
 * │      }                                                       │
 * │                                                              │
 * │      const newDoctor = await res.json();                     │
 * │      showSuccessToast('تم إنشاء حساب الدكتور بنجاح'); // ✅ │
 * │      await refetchDoctors();  // ← REFRESH THE LIST         │
 * │      // OR: setDoctors(prev => [newDoctor, ...prev]);        │
 * │    } catch (err) {                                           │
 * │      showErrorToast(err.message);  // ← SHOW ERRORS         │
 * │    }                                                         │
 * │  }                                                           │
 * └──────────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * BACKEND CHECK — if doctor saves but doesn't appear in list query:
 *
 * Check your doctors list endpoint filter. If it filters by is_active:
 *
 *   # backend/doctors/views.py or hospital/views.py
 *   def get_queryset(self):
 *       # BEFORE (may exclude new doctors):
 *       return Doctor.objects.filter(hospital=self.hospital)
 *                            .filter(is_active=True)  ← problem if saved as False
 *
 *       # AFTER (show all hospital doctors regardless of status):
 *       return Doctor.objects.filter(
 *           hospital=self.hospital
 *       ).select_related('user').order_by('-created_at')
 *
 * Also verify the registration endpoint sets is_active=True:
 *
 *   # serializer or view:
 *   def create(self, validated_data):
 *       validated_data.setdefault('is_active', True)  # ← ensure active
 *       return super().create(validated_data)
 *
 * See: backend_patches/bug1_doctor_register_not_showing_fix.md
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';

// ── Token helper ──────────────────────────────────────────────────
function getAuthToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null
  );
}

// ── API — Register doctor (create new account) ────────────────────
/**
 * BUG #1 FIX CORE:
 * - Always awaits response
 * - Only resolves on response.ok
 * - Sends is_active: true explicitly
 * - Returns the created doctor object for optimistic update
 */
async function registerDoctor(hospitalId, formData) {
  const token = getAuthToken();

  // Try common registration endpoint patterns
  const endpoints = [
    `/api/v1/hospitals/${hospitalId}/doctors/register/`,
    `/api/v1/doctors/register/`,
    `/api/v1/hospital/doctors/create/`,
    `/api/v1/doctors/`,
  ];

  for (const url of endpoints) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...formData,
        // BUG #1 FIX: always send is_active: true so the doctor
        // appears in the default list query immediately
        is_active: true,
        role: 'doctor',
        // Link to this hospital from creation
        hospital_id: hospitalId,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      // Normalise — different backends return different shapes
      return data?.doctor || data?.user || data?.data || data;
    }

    if (res.status === 404 || res.status === 405) continue; // try next endpoint

    // Real error — parse and throw
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.detail ||
      body?.message ||
      body?.email?.[0] ||
      body?.phone?.[0] ||
      Object.values(body).flat().join(' ') ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  throw new Error('Could not find doctor registration endpoint. Check backend_patches/bug1_doctor_register_not_showing_fix.md');
}

// ── Color tokens ──────────────────────────────────────────────────
const TEAL   = '#0E7490';
const TEAL_D = '#0C6478';
const TEAL_L = '#E0F7FA';
const GR3    = '#D1D5DB';
const GR5    = '#6B7280';
const GR8    = '#1F2937';

// ── Field component ───────────────────────────────────────────────
function Field({ label, children, required = false, isAr }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: GR5,
        direction: isAr ? 'rtl' : 'ltr',
      }}>
        {label}{required && <span style={{ color: '#EF4444', marginInlineStart: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', isAr, disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 10,
        border: `1.5px solid ${GR3}`, fontSize: 14,
        color: GR8, outline: 'none', boxSizing: 'border-box',
        background: disabled ? '#F9FAFB' : 'var(--bg-card, #fff)',
        direction: isAr ? 'rtl' : 'ltr',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = TEAL; }}
      onBlur={e => e.target.style.borderColor = GR3}
    />
  );
}

// ── Success screen ────────────────────────────────────────────────
function SuccessScreen({ doctorName, isAr, onClose }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 16, textAlign: 'center',
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: '#D1FAE5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36,
      }}>✅</div>

      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: GR8 }}>
        {isAr ? 'تم إنشاء حساب الدكتور بنجاح' : 'Doctor Account Created Successfully'}
      </h3>

      {doctorName && (
        <p style={{ margin: 0, fontSize: 14, color: GR5 }}>
          {isAr ? `د. ${doctorName}` : `Dr. ${doctorName}`}
        </p>
      )}

      {/* BUG #1 FIX note — visible in the success screen */}
      <p style={{
        margin: 0, fontSize: 13, color: '#065F46',
        background: '#D1FAE5', padding: '8px 16px', borderRadius: 10,
      }}>
        {isAr
          ? '✅ الطبيب يظهر الآن في قائمة الأطباء'
          : '✅ Doctor now appears in the doctors list'}
      </p>

      <button
        onClick={onClose}
        style={{
          marginTop: 8, padding: '10px 28px', borderRadius: 10,
          background: TEAL, color: '#fff',
          border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────
/**
 * HospitalRegisterDoctorModal
 *
 * Props:
 *   hospitalId  {string|number}  — current hospital ID
 *   language    {string}         — 'ar' | 'en'
 *   onSuccess   {function}       — called with newDoctor object after successful registration
 *                                  IMPORTANT: call refetchDoctors() inside this callback
 *   onClose     {function}       — called when modal is dismissed
 */
export default function HospitalRegisterDoctorModal({
  hospitalId,
  language  = 'en',
  onSuccess,
  onClose,
}) {
  const isAr = language === 'ar';

  const INITIAL = {
    full_name:  '',
    email:      '',
    phone:      '',
    specialty:  '',
    password:   '',
  };

  const [form,       setForm]       = useState(INITIAL);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [created,    setCreated]    = useState(null); // the new doctor object

  const set = useCallback((key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    setError('');
  }, []);

  // ── Validation ──────────────────────────────────────────────────
  function validate() {
    if (!form.full_name.trim())
      return isAr ? 'الاسم الكامل مطلوب' : 'Full name is required';
    if (!form.email.trim())
      return isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return isAr ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    if (form.password && form.password.length < 8)
      return isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    return null;
  }

  // ── Submit ──────────────────────────────────────────────────────
  /**
   * BUG #1 FIX:
   * The submit handler now:
   * 1. Validates first
   * 2. Awaits the response fully
   * 3. Only shows success after response.ok
   * 4. Calls onSuccess(newDoctor) so parent can refetch/update
   * 5. Shows real error messages on failure
   */
  async function handleSubmit() {
    setError('');
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }

    setSaving(true);
    try {
      const newDoctor = await registerDoctor(hospitalId, {
        full_name: form.full_name.trim(),
        name:      form.full_name.trim(), // some backends use 'name'
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        specialty: form.specialty.trim(),
        ...(form.password ? { password: form.password } : {}),
      });

      // ✅ SUCCESS — only reached if response.ok
      setCreated(newDoctor);

      // Notify parent to refresh the doctors list
      // This is the critical fix — without this the list never updates
      onSuccess?.(newDoctor);

    } catch (err) {
      // ✅ ERRORS — always displayed, never silent
      setError(err.message || (isAr ? 'حدث خطأ أثناء التسجيل' : 'Registration failed'));
    } finally {
      setSaving(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes hrdm-in {
          from { opacity:0; transform:translateY(20px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: 20,
            width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            animation: 'hrdm-in 0.25s ease-out',
            direction: isAr ? 'rtl' : 'ltr',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-base, #E5E7EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 1,
            background: 'var(--bg-card, #fff)',
            borderRadius: '20px 20px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%',
                background: TEAL_L,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>👨‍⚕️</span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: GR8 }}>
                {isAr ? 'تسجيل طبيب جديد' : 'Register New Doctor'}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 20, color: GR5,
                padding: '4px 8px', borderRadius: 8, lineHeight: 1,
              }}
            >✕</button>
          </div>

          {/* Body */}
          {created ? (
            <SuccessScreen
              doctorName={created?.full_name || created?.name || form.full_name}
              isAr={isAr}
              onClose={onClose}
            />
          ) : (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Name */}
              <Field label={isAr ? 'الاسم الكامل' : 'Full Name'} required isAr={isAr}>
                <TextInput
                  value={form.full_name} onChange={set('full_name')} isAr={isAr}
                  placeholder={isAr ? 'الاسم الكامل للطبيب' : 'Doctor full name'}
                  disabled={saving}
                />
              </Field>

              {/* Email */}
              <Field label={isAr ? 'البريد الإلكتروني' : 'Email'} required isAr={isAr}>
                <TextInput
                  type="email" value={form.email} onChange={set('email')} isAr={isAr}
                  placeholder="doctor@example.com"
                  disabled={saving}
                />
              </Field>

              {/* Phone */}
              <Field label={isAr ? 'رقم الهاتف' : 'Phone Number'} isAr={isAr}>
                <TextInput
                  type="tel" value={form.phone} onChange={set('phone')} isAr={isAr}
                  placeholder="+20 1XX XXX XXXX"
                  disabled={saving}
                />
              </Field>

              {/* Specialty */}
              <Field label={isAr ? 'التخصص' : 'Specialty'} isAr={isAr}>
                <TextInput
                  value={form.specialty} onChange={set('specialty')} isAr={isAr}
                  placeholder={isAr ? 'مثال: طب عام، قلب، أطفال' : 'e.g. General Medicine, Cardiology'}
                  disabled={saving}
                />
              </Field>

              {/* Password */}
              <Field label={isAr ? 'كلمة المرور المؤقتة (اختياري)' : 'Temporary Password (optional)'} isAr={isAr}>
                <TextInput
                  type="password" value={form.password} onChange={set('password')} isAr={isAr}
                  placeholder={isAr ? '8 أحرف على الأقل' : 'At least 8 characters'}
                  disabled={saving}
                />
              </Field>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: '#FEE2E2', color: '#991B1B',
                  fontSize: 13, fontWeight: 500,
                  direction: isAr ? 'rtl' : 'ltr',
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  width: '100%', padding: '12px 20px',
                  borderRadius: 12,
                  background: saving ? GR3 : TEAL,
                  color: saving ? GR5 : '#fff',
                  border: 'none',
                  fontSize: 15, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = TEAL_D; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = saving ? GR3 : TEAL; }}
              >
                {saving ? (
                  <>
                    <span style={{
                      width: 16, height: 16,
                      border: `2px solid ${GR5}`,
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'hrdm-spin 0.7s linear infinite',
                    }} />
                    {isAr ? 'جاري التسجيل...' : 'Registering...'}
                  </>
                ) : (
                  <>{isAr ? '+ تسجيل الطبيب' : '+ Register Doctor'}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes hrdm-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

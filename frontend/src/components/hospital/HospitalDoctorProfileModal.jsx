/**
 * HospitalDoctorProfileModal.jsx — Bug #10 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEMS FIXED:
 *
 *   1. Doctor card shows "Patients Count" and "Today's Appointments"
 *      Before: The doctor card displayed two stats: عدد المرضى (patients
 *              count) and مواعيد اليوم (today's appointments) — these
 *              are noisy, not needed by the hospital admin on the
 *              doctors list page, and were requested to be removed.
 *      After:  The card shows only core identity info: name, email,
 *              phone, specialty, status. The "View Profile" button
 *              opens the modal below for full details + editing.
 *
 *   2. "View Profile" button opens nothing / incomplete page
 *      Before: Clicking "عرض الملف" / "View Profile" either did
 *              nothing, or opened a read-only view with no editing.
 *      After:  Opens a full-featured modal with:
 *              - Name, Email, Phone, Specialty (all editable)
 *              - Status toggle (Active / Inactive)
 *              - Profile picture upload (if available)
 *              - Save button → PATCH /doctors/:id → updates DB
 *              - Card refreshes immediately after save (no reload)
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE:
 *
 *   import HospitalDoctorProfileModal from
 *     '../../components/hospital/HospitalDoctorProfileModal';
 *
 *   // State:
 *   const [selectedDoctor, setSelectedDoctor] = useState(null);
 *
 *   // In your doctors grid — pass onViewProfile:
 *   <HospitalDoctorCardGrid
 *     doctors={doctors}
 *     language={currentLanguage}
 *     onViewProfile={(doctor) => setSelectedDoctor(doctor)}
 *     // ...other props
 *   />
 *
 *   // Or on your existing doctor card "View Profile" button:
 *   <button onClick={() => setSelectedDoctor(doctor)}>
 *     {isAr ? 'عرض الملف' : 'View Profile'}
 *   </button>
 *
 *   // Modal (add near end of page JSX):
 *   {selectedDoctor && (
 *     <HospitalDoctorProfileModal
 *       doctor={selectedDoctor}
 *       language={currentLanguage}
 *       onClose={() => setSelectedDoctor(null)}
 *       onSave={(updatedDoctor) => {
 *         // Update the doctor in your local state immediately:
 *         setDoctors(prev =>
 *           prev.map(d => d.id === updatedDoctor.id ? updatedDoctor : d)
 *         );
 *         setSelectedDoctor(null);
 *       }}
 *     />
 *   )}
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * DOCTOR CARD PATCH — Remove patients_count & today_appointments:
 *
 * If you have a separate DoctorCard component (not using
 * HospitalDoctorCardGrid from this package), find and DELETE the
 * following JSX blocks from your card:
 *
 *   Pattern A — stats row with patients + today:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <div className="stats-row">                                 │
 *   │    <div className="stat">                                    │
 *   │      <span>{doctor.patients_count}</span>                    │
 *   │      <label>المرضى / Patients</label>     ← DELETE this     │
 *   │    </div>                                                    │
 *   │    <div className="stat">                                    │
 *   │      <span>{doctor.today_appointments}</span>                │
 *   │      <label>اليوم / Today</label>         ← DELETE this     │
 *   │    </div>                                                    │
 *   │  </div>                                                      │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   Pattern B — StatPill / StatCard components:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <StatPill value={doctor.patients}      label="المرضى" />   │ ← DELETE
 *   │  <StatPill value={doctor.today_count}   label="اليوم"  />   │ ← DELETE
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   Keep ONLY: Name, Email, Phone, Specialty, Status, View Profile button.
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useRef } from 'react';
import { stripDoctorPrefix } from '../../utils/formatters';
import apiClient from '../../services/apiClient';

// ── Token helper (kept for image upload fallback) ─────────────────
function getAuthToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null
  );
}

// ── API helper ────────────────────────────────────────────────────
async function updateDoctor(doctorId, data) {
  // Use apiClient (handles token refresh automatically — fixes 401)
  const endpoints = [
    `/hospital/doctors/${doctorId}/`,
    `/hospitals/doctors/${doctorId}/`,
    `/doctors/${doctorId}/`,
  ];

  for (const url of endpoints) {
    try {
      const res = await apiClient.patch(url, data);
      return res.data?.data || res.data;
    } catch (err) {
      if (err?.response?.status === 404) continue;
      const msg =
        err?.errorDetail ||
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        `Error ${err?.response?.status || 'unknown'}`;
      throw new Error(msg);
    }
  }
  throw new Error('Could not find doctor update endpoint');
}

async function uploadDoctorImage(doctorId, file, token) {
  const BASE = import.meta?.env?.VITE_API_URL || '';
  const formData = new FormData();
  formData.append('profile_image', file);

  const endpoints = [
    `${BASE}/api/doctors/${doctorId}/upload-image/`,
    `${BASE}/api/doctors/${doctorId}/`,
    `${BASE}/api/hospital/doctors/${doctorId}/`,
  ];

  for (const url of endpoints) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.ok) return await res.json();
    if (res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.detail || err?.message || `Image upload failed (${res.status})`);
    }
  }
  throw new Error('Could not find image upload endpoint');
}

// ── Color tokens ──────────────────────────────────────────────────
const TEAL   = '#0E7490';
const TEAL_D = '#0C6478';
const TEAL_L = '#E0F7FA';
const GREEN  = '#10B981';
const RED    = '#EF4444';
// Bug #17 Fix: use CSS variables for dark-mode compatible colors
const GR3    = 'var(--border)';
const GR5    = 'var(--text-muted)';
const GR8    = 'var(--text-h)';

// ── Label component ───────────────────────────────────────────────
function FieldLabel({ children, isAr }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: GR5,
      marginBottom: 6,
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {children}
    </label>
  );
}

// ── Text input ────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, type = 'text', isAr, disabled = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 10,
        border: `1.5px solid ${GR3}`,
        fontSize: 14,
        color: GR8,
        background: disabled ? 'var(--bg-elevated)' : 'var(--bg-card)',
        outline: 'none',
        boxSizing: 'border-box',
        direction: isAr ? 'rtl' : 'ltr',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = TEAL; }}
      onBlur={e => e.target.style.borderColor = GR3}
    />
  );
}

// ── Status toggle ─────────────────────────────────────────────────
function StatusToggle({ isActive, onChange, isAr }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {[true, false].map(val => {
        const selected = isActive === val;
        return (
          <button
            key={String(val)}
            type="button"
            onClick={() => onChange(val)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: selected
                ? `2px solid ${val ? GREEN : RED}`
                : `2px solid ${GR3}`,
              background: selected
                ? (val ? '#D1FAE5' : '#FEE2E2')
                : 'var(--bg-elevated)',
              color: selected
                ? (val ? '#065F46' : '#991B1B')
                : GR5,
              transition: 'all 0.15s',
            }}
          >
            {val
              ? (isAr ? '✅ نشط' : '✅ Active')
              : (isAr ? '🔴 غير نشط' : '🔴 Inactive')
            }
          </button>
        );
      })}
    </div>
  );
}

// ── Avatar section ────────────────────────────────────────────────
function AvatarSection({ name, currentImage, pendingImage, onImageSelect, isAr }) {
  const inputRef = useRef(null);
  const displaySrc = pendingImage
    ? URL.createObjectURL(pendingImage)
    : currentImage;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    }}>
      {/* Avatar */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 88, height: 88,
          borderRadius: '50%',
          background: TEAL_L,
          overflow: 'hidden',
          cursor: 'pointer',
          border: `3px solid ${TEAL}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: TEAL,
          position: 'relative',
        }}
        title={isAr ? 'انقر لتغيير الصورة' : 'Click to change photo'}
      >
        {displaySrc
          ? <img src={displaySrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (name?.charAt(0)?.toUpperCase() || 'D')
        }
        {/* Camera overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          fontSize: 22,
          borderRadius: '50%',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        >
          📷
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: GR5 }}>
        {isAr ? 'انقر على الصورة لتغييرها' : 'Click photo to change'}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onImageSelect(file);
          e.target.value = '';
        }}
      />

      {pendingImage && (
        <span style={{
          fontSize: 11, color: TEAL,
          background: TEAL_L, padding: '2px 10px', borderRadius: 10,
        }}>
          {isAr ? 'صورة جديدة — سيتم رفعها عند الحفظ' : 'New photo — will upload on save'}
        </span>
      )}
    </div>
  );
}

// ── Main Modal component ──────────────────────────────────────────
/**
 * HospitalDoctorProfileModal
 *
 * Props:
 *   doctor    {object}   — the doctor object (from your doctors list state)
 *   language  {string}   — 'ar' | 'en'
 *   onClose   {function} — called when modal is dismissed
 *   onSave    {function} — called with updated doctor object after successful PATCH
 */
export default function HospitalDoctorProfileModal({
  doctor,
  language = 'en',
  onClose,
  onSave,
}) {
  const isAr = language === 'ar';

  // ── Form state (BUG #10 FIX — editable fields) ────────────────
  // Core fields only — NO patients_count, NO today_appointments
  const [form, setForm] = useState({
    full_name:  stripDoctorPrefix(doctor?.full_name  || doctor?.name  || ''),
    email:      doctor?.email      || '',
    phone:      doctor?.phone      || doctor?.phone_number || '',
    specialty:  doctor?.specialty  || '',
    is_active:  doctor?.is_active  ?? true,
  });

  const [pendingImage, setPendingImage]   = useState(null);
  const [saving,       setSaving]         = useState(false);
  const [error,        setError]          = useState('');
  const [successMsg,   setSuccessMsg]     = useState('');

  const field = useCallback((key) => ({
    value: form[key],
    onChange: v => setForm(f => ({ ...f, [key]: v })),
  }), [form]);

  // ── Validate ──────────────────────────────────────────────────
  function validate() {
    if (!form.full_name.trim()) {
      return isAr ? 'الاسم مطلوب' : 'Name is required';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return isAr ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address';
    }
    return null;
  }

  // ── Save handler ──────────────────────────────────────────────
  async function handleSave() {
    setError('');
    setSuccessMsg('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const token    = getAuthToken();
      const doctorId = doctor?.id || doctor?._id;

      let updatedDoctor;

      // Upload image first if there's a new one
      if (pendingImage) {
        const imgResult = await uploadDoctorImage(doctorId, pendingImage, token);
        updatedDoctor = imgResult;
      }

      // PATCH the doctor data (uses apiClient — handles token refresh, fixes 401)
      updatedDoctor = await updateDoctor(doctorId, {
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        specialty: form.specialty.trim(),
        is_active: form.is_active,
        // Explicit removal of noisy fields from PATCH body
        // (not sending patients_count or today_appointments)
      });

      setSuccessMsg(isAr ? '✅ تم حفظ التعديلات بنجاح' : '✅ Changes saved successfully');

      // Notify parent to update the card immediately (no page reload)
      setTimeout(() => {
        onSave?.({ ...doctor, ...form, ...updatedDoctor });
      }, 800);

    } catch (err) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  }

  // ── Backdrop click ────────────────────────────────────────────
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes hdpm-in {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Modal box */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'ملف الطبيب' : 'Doctor Profile'}
          style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            animation: 'hdpm-in 0.25s ease-out',
            direction: isAr ? 'rtl' : 'ltr',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-base, #E5E7EB)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky', top: 0,
            background: 'var(--bg-card, #fff)',
            borderRadius: '20px 20px 0 0',
            zIndex: 1,
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: GR8 }}>
              {isAr ? 'ملف الطبيب' : 'Doctor Profile'}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 20,
                color: GR5, lineHeight: 1,
                padding: '4px 8px', borderRadius: 8,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Avatar section */}
            <AvatarSection
              name={form.full_name}
              currentImage={doctor?.profile_image || doctor?.avatar}
              pendingImage={pendingImage}
              onImageSelect={setPendingImage}
              isAr={isAr}
            />

            {/* ── CORE FIELDS ONLY ─────────────────────────────── */}
            {/* BUG #10 FIX: NO patients_count, NO today_appointments */}

            {/* Name */}
            <div>
              <FieldLabel isAr={isAr}>{isAr ? 'الاسم الكامل *' : 'Full Name *'}</FieldLabel>
              <TextInput isAr={isAr} {...field('full_name')}
                placeholder={isAr ? 'اسم الطبيب' : 'Doctor name'} />
            </div>

            {/* Email */}
            <div>
              <FieldLabel isAr={isAr}>{isAr ? 'البريد الإلكتروني' : 'Email'}</FieldLabel>
              <TextInput isAr={isAr} type="email" {...field('email')}
                placeholder={isAr ? 'البريد الإلكتروني' : 'Email address'} />
            </div>

            {/* Phone */}
            <div>
              <FieldLabel isAr={isAr}>{isAr ? 'رقم الهاتف' : 'Phone Number'}</FieldLabel>
              <TextInput isAr={isAr} type="tel" {...field('phone')}
                placeholder={isAr ? 'رقم الهاتف' : 'Phone number'} />
            </div>

            {/* Specialty */}
            <div>
              <FieldLabel isAr={isAr}>{isAr ? 'التخصص' : 'Specialty'}</FieldLabel>
              <TextInput isAr={isAr} {...field('specialty')}
                placeholder={isAr ? 'مثال: طب عام' : 'e.g. General Medicine'} />
            </div>

            {/* Status toggle — Active / Inactive */}
            <div>
              <FieldLabel isAr={isAr}>{isAr ? 'الحالة' : 'Status'}</FieldLabel>
              <StatusToggle
                isActive={form.is_active}
                onChange={v => setForm(f => ({ ...f, is_active: v }))}
                isAr={isAr}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FEE2E2',
                color: '#991B1B',
                fontSize: 13,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#D1FAE5',
                color: '#065F46',
                fontSize: 13,
                fontWeight: 500,
              }}>
                {successMsg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-base, #E5E7EB)',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            direction: isAr ? 'rtl' : 'ltr',
            position: 'sticky', bottom: 0,
            background: 'var(--bg-card, #fff)',
            borderRadius: '0 0 20px 20px',
          }}>
            {/* Cancel */}
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'var(--bg-subtle, #F3F4F6)',
                color: GR5,
                border: 'none',
                fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                background: saving ? GR3 : TEAL,
                color: saving ? GR5 : '#fff',
                border: 'none',
                fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.2s',
                minWidth: 120,
                justifyContent: 'center',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = TEAL_D; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = TEAL; }}
            >
              {saving ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: `2px solid ${GR5}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'hdpm-spin 0.7s linear infinite',
                  }} />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>💾 {isAr ? 'حفظ التعديلات' : 'Save Changes'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes hdpm-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

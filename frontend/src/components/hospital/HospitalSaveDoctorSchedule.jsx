/**
 * HospitalSaveDoctorSchedule.jsx — Bug #2 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEM FIXED:
 *   When hospital admin clicks "Save Doctor Schedule", the system
 *   returns: "This operation is available to doctors only"
 *   and no schedule changes are saved.
 *
 *   Root cause: The Save Schedule endpoint uses an `IsDoctor`
 *   permission class that only allows role === 'doctor'.
 *   Hospital admins (role === 'hospital_admin') are rejected
 *   even though managing doctor schedules is their core job.
 *
 *   This fix provides:
 *   1. A patched API call function that correctly sends the
 *      doctor_id in the request body (required when caller is
 *      hospital_admin, not the doctor themselves)
 *   2. A reusable SaveScheduleButton component with correct error
 *      handling and clear feedback
 *   3. Detailed backend patch instructions
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE:
 *
 *   import { saveDoctorSchedule, SaveScheduleButton }
 *     from '../../components/hospital/HospitalSaveDoctorSchedule';
 *
 *   // Replace your existing "Save Doctor Schedule" button with:
 *   <SaveScheduleButton
 *     doctorId={selectedDoctor.id}
 *     scheduleData={currentScheduleData}
 *     language={currentLanguage}
 *     onSuccess={() => {
 *       showToast('تم حفظ الجدول بنجاح');
 *       refetchSchedule();
 *     }}
 *     onError={(msg) => showToast(msg, 'error')}
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * QUICK PATCH — if you only want to fix your existing submit call:
 *
 * Find your "Save Doctor Schedule" handler and apply this pattern:
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  // BEFORE (broken for hospital_admin):                      │
 * │  const res = await fetch('/api/v1/schedules/save/', {        │
 * │    method: 'POST',                                           │
 * │    body: JSON.stringify(scheduleData),  // no doctor_id!     │
 * │  });                                                         │
 * │  // Error: "This operation is available to doctors only"     │
 * └──────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  // AFTER (works for both doctor and hospital_admin):        │
 * │  const currentUser = JSON.parse(                             │
 * │    localStorage.getItem('user') || '{}'                      │
 * │  );                                                          │
 * │  const isAdmin = currentUser.role === 'hospital_admin';      │
 * │                                                              │
 * │  const res = await fetch('/api/v1/schedules/save/', {        │
 * │    method: 'POST',                                           │
 * │    headers: {                                                │
 * │      'Content-Type': 'application/json',                     │
 * │      Authorization: `Bearer ${token}`,                       │
 * │    },                                                        │
 * │    body: JSON.stringify({                                    │
 * │      ...scheduleData,                                        │
 * │      // ← CRITICAL: include doctor_id when calling as admin  │
 * │      ...(isAdmin ? { doctor_id: selectedDoctor.id } : {}),   │
 * │    }),                                                       │
 * │  });                                                         │
 * │                                                              │
 * │  if (!res.ok) {                                              │
 * │    const err = await res.json();                             │
 * │    // Show real error — not a generic toast                  │
 * │    setError(err.detail || 'Failed to save schedule');        │
 * │    return;                                                   │
 * │  }                                                           │
 * │  // Only now show success                                    │
 * │  showSuccess('تم حفظ الجدول بنجاح');                        │
 * └──────────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────
 * IMPORTANT: The Backend MUST also be fixed.
 * See: backend_patches/bug2_save_schedule_auth_fix.md
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';

// ── Token + user helpers ──────────────────────────────────────────
function getAuthToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null
  );
}

function getCurrentUser() {
  try {
    // BUG-2 FIX: CuraBook stores user under '__cb_user' key (tokenUtils.jsx META_KEYS.user),
    // not 'user' or 'currentUser'. Previous code always returned {} causing isAdmin=false.
    return JSON.parse(
      localStorage.getItem('__cb_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('currentUser') ||
      sessionStorage.getItem('user') ||
      '{}'
    );
  } catch {
    return {};
  }
}

// ── API helper — Save Doctor Schedule ─────────────────────────────
/**
 * saveDoctorSchedule()
 * ─────────────────────
 * BUG #2 FIX — Core logic:
 *
 * When the caller is hospital_admin:
 *   - Sends doctor_id in the body (backend needs this to identify
 *     which doctor's schedule to save, since the user is not the doctor)
 *
 * When the caller is doctor:
 *   - Sends without doctor_id (backend uses request.user)
 *
 * Tries multiple common endpoint patterns.
 *
 * @param {string|number} doctorId    — ID of the doctor whose schedule is being saved
 * @param {object}        scheduleData — schedule payload (days, slots, etc.)
 * @returns {Promise<object>}          — saved schedule data from backend
 */
export async function saveDoctorSchedule(doctorId, scheduleData) {
  const token       = getAuthToken();
  const currentUser = getCurrentUser();
  // BUG-2 FIX: Backend returns current_role='hospital' (not 'hospital_admin').
  // Also check the raw role field AND the hospital_admin boolean flag.
  const isAdmin = (
    currentUser?.role         === 'hospital_admin' ||
    currentUser?.current_role === 'hospital' ||
    currentUser?.current_role === 'hospital_admin' ||
    currentUser?.hospital_admin === true
  );

  // BUG #2 FIX: always include doctor_id when saving as hospital_admin
  const body = {
    ...scheduleData,
    ...(isAdmin && doctorId ? { doctor_id: doctorId } : {}),
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Try common save-schedule endpoint patterns
  const endpoints = [
    `/api/v1/doctors/${doctorId}/schedule/`,
    `/api/v1/schedules/save/`,
    `/api/v1/schedules/doctor/${doctorId}/`,
    `/api/v1/hospital/schedule/save/`,
  ];

  for (const url of endpoints) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return await res.json().catch(() => ({}));
    }

    // 404 / 405 = wrong endpoint, try next
    if (res.status === 404 || res.status === 405) continue;

    // Real error — parse and re-throw with clear message
    const errBody = await res.json().catch(() => ({}));
    const msg =
      errBody?.detail ||
      errBody?.message ||
      errBody?.error ||
      Object.values(errBody).flat().join(' ') ||
      `HTTP ${res.status}`;

    // Special handling for the "doctors only" error
    if (
      msg.toLowerCase().includes('doctors only') ||
      msg.toLowerCase().includes('doctor only') ||
      res.status === 403
    ) {
      throw new Error(
        'PERMISSION_ERROR: Backend needs to allow hospital_admin for this endpoint. ' +
        'See backend_patches/bug2_save_schedule_auth_fix.md'
      );
    }

    throw new Error(msg);
  }

  throw new Error(
    'Could not find save-schedule endpoint. ' +
    'See backend_patches/bug2_save_schedule_auth_fix.md'
  );
}

// ── Color tokens ──────────────────────────────────────────────────
const TEAL   = '#0E7490';
const TEAL_D = '#0C6478';
const GR3    = '#D1D5DB';
const GR5    = '#6B7280';

// ── SaveScheduleButton component ──────────────────────────────────
/**
 * SaveScheduleButton
 * ───────────────────
 * Drop-in replacement for the existing "Save Doctor Schedule" button.
 * Handles the API call, loading state, error display, and success callback.
 *
 * Props:
 *   doctorId      {string|number}  — doctor whose schedule is being saved
 *   scheduleData  {object}         — schedule payload to send
 *   language      {string}         — 'ar' | 'en'
 *   onSuccess     {function}       — called with saved data on success
 *   onError       {function}       — called with error message string
 *   disabled      {boolean}        — disable the button
 *   style         {object}         — extra inline styles
 */
export function SaveScheduleButton({
  doctorId,
  scheduleData = {},
  language     = 'en',
  onSuccess,
  onError,
  disabled     = false,
  style        = {},
}) {
  const isAr = language === 'ar';
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    if (!doctorId) {
      const msg = isAr
        ? 'يجب تحديد الطبيب أولاً'
        : 'Please select a doctor first';
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    setLocalError('');
    setLocalSuccess(false);
    setSaving(true);

    try {
      const result = await saveDoctorSchedule(doctorId, scheduleData);
      setLocalSuccess(true);
      onSuccess?.(result);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      let msg = err.message;

      // Humanise the permission error
      if (msg.startsWith('PERMISSION_ERROR:')) {
        msg = isAr
          ? 'خطأ في الصلاحيات — يحتاج الـ Backend إصلاحاً. راجع bug2_save_schedule_auth_fix.md'
          : 'Permission error — Backend fix required. See bug2_save_schedule_auth_fix.md';
      }

      setLocalError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  }, [doctorId, scheduleData, isAr, onSuccess, onError]);

  const btnBg = localSuccess ? '#10B981' : saving ? GR3 : TEAL;
  const btnColor = localSuccess ? '#fff' : saving ? GR5 : '#fff';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleSave}
        disabled={saving || disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 12,
          background: btnBg,
          color: btnColor,
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving || disabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          whiteSpace: 'nowrap',
          direction: isAr ? 'rtl' : 'ltr',
          ...style,
        }}
        onMouseEnter={e => {
          if (!saving && !disabled && !localSuccess)
            e.currentTarget.style.background = TEAL_D;
        }}
        onMouseLeave={e => {
          if (!saving && !disabled && !localSuccess)
            e.currentTarget.style.background = TEAL;
        }}
      >
        {saving ? (
          <>
            <span style={{
              width: 14, height: 14,
              border: `2px solid ${GR5}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'hss-spin 0.7s linear infinite',
            }} />
            {isAr ? 'جاري الحفظ...' : 'Saving...'}
          </>
        ) : localSuccess ? (
          <>{isAr ? '✅ تم الحفظ' : '✅ Saved'}</>
        ) : (
          <>💾 {isAr ? 'حفظ جدول الطبيب' : 'Save Doctor Schedule'}</>
        )}
      </button>

      {/* Inline error — shown below the button */}
      {localError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: '#FEE2E2',
          color: '#991B1B',
          fontSize: 12,
          fontWeight: 500,
          maxWidth: 320,
          direction: isAr ? 'rtl' : 'ltr',
        }}>
          ⚠️ {localError}
        </div>
      )}

      <style>{`@keyframes hss-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// Default export = the button (most common use case)
export default SaveScheduleButton;

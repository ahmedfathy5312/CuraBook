/**
 * GenerateSlotsPanel.jsx — Bug #3 Fix (Frontend Part)
 * ─────────────────────────────────────────────────────────────────
 * Fixes two problems:
 *   1. Date field shows year 0026 — fixed via date normalization
 *      and input min/max constraints.
 *   2. Shows user-friendly validation BEFORE hitting the API,
 *      preventing the confusing "doctors only" error from appearing.
 *
 * HOW TO USE — replace the existing Generate Slots form in
 * HospitalSchedules page with:
 *
 *   import GenerateSlotsPanel from
 *     '../../components/hospital/GenerateSlotsPanel';
 *
 *   <GenerateSlotsPanel
 *     doctorId={selectedDoctorId}
 *     onSuccess={() => refetchSlots()}
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 * NOTE: The backend ALSO needs a fix (see backend_patches/schedules_fix.md).
 * This frontend fix adds validation and corrects the date but the backend
 * must allow hospital_admin role for the endpoint to actually work.
 * ─────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';

// ── Date helpers ─────────────────────────────────────────────────

/** Normalize a date input value to YYYY-MM-DD, correcting bad years. */
function normalizeDateValue(rawValue) {
  if (!rawValue) return '';
  try {
    const d = new Date(rawValue);
    if (isNaN(d.getTime())) return rawValue;

    let year = d.getFullYear();
    const currentYear = new Date().getFullYear();

    // Fix: if the browser parsed 0026 or any year outside 2020–2035,
    // snap to current year (common browser bug with 2-digit year entry)
    if (year < 2020 || year > 2035) {
      year = currentYear;
      d.setFullYear(year);
    }

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch {
    return rawValue;
  }
}

/** Today's date in YYYY-MM-DD format */
function todayStr() {
  return normalizeDateValue(new Date().toISOString().slice(0, 10));
}

/** Date 3 months from today in YYYY-MM-DD format */
function maxDateStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return normalizeDateValue(d.toISOString().slice(0, 10));
}

// ── Validation ────────────────────────────────────────────────────

function validateDates(fromDate, toDate) {
  const errors = [];
  const currentYear = new Date().getFullYear();

  if (!fromDate) { errors.push('حقل "من" مطلوب'); }
  if (!toDate)   { errors.push('حقل "إلى" مطلوب'); }

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    const to   = new Date(toDate);
    const now  = new Date(); now.setHours(0,0,0,0);

    if (isNaN(from.getTime())) {
      errors.push('تاريخ البداية غير صالح');
    } else if (from.getFullYear() < 2020 || from.getFullYear() > 2030) {
      errors.push(`سنة تاريخ البداية غير منطقية (${from.getFullYear()}). استخدم سنة بين 2020 و2030`);
    }

    if (isNaN(to.getTime())) {
      errors.push('تاريخ النهاية غير صالح');
    } else if (to.getFullYear() < 2020 || to.getFullYear() > 2030) {
      errors.push(`سنة تاريخ النهاية غير منطقية (${to.getFullYear()}). استخدم سنة بين 2020 و2030`);
    }

    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      if (to < from) {
        errors.push('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
      const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        errors.push('نطاق التواريخ كبير جداً — الحد الأقصى 90 يوماً في المرة الواحدة');
      }
    }
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────

export default function GenerateSlotsPanel({
  doctorId = null,
  hospitalId = null,
  onSuccess = null,
  onError   = null,
  language  = 'ar',
}) {
  const isAr = language === 'ar';

  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState([]);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null;

  // Handle date change with auto-correction
  const handleFromChange = (e) => {
    const val = normalizeDateValue(e.target.value);
    setFromDate(val);
    setErrors([]);
    setFeedback(null);
  };

  const handleToChange = (e) => {
    const val = normalizeDateValue(e.target.value);
    setToDate(val);
    setErrors([]);
    setFeedback(null);
  };

  const handleGenerate = async () => {
    // 1. Validate dates BEFORE calling the API
    const validationErrors = validateDates(fromDate, toDate);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!doctorId) {
      setErrors([isAr ? 'يرجى اختيار طبيب أولاً' : 'Please select a doctor first']);
      return;
    }

    setLoading(true);
    setErrors([]);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/v1/schedules/generate-slots/?doctor_id=${doctorId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            from_date: fromDate,
            to_date:   toDate,
            doctor_id: doctorId,
            doctor:    doctorId,
            ...(hospitalId ? { hospital: hospitalId } : {}),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setFeedback({
          type: 'success',
          msg: isAr
            ? `✅ تم توليد المواعيد بنجاح من ${fromDate} إلى ${toDate}`
            : `✅ Slots generated successfully from ${fromDate} to ${toDate}`,
        });
        setFromDate('');
        setToDate('');
        if (onSuccess) onSuccess(data);
      } else {
        // Show a meaningful error — NOT the raw "doctors only" message
        const rawMsg = data?.detail || data?.message || data?.error || '';
        let userMsg;

        if (response.status === 403) {
          userMsg = isAr
            ? 'ليس لديك صلاحية توليد المواعيد. تواصل مع مدير النظام.'
            : 'You do not have permission to generate slots. Contact your system admin.';
        } else if (rawMsg.toLowerCase().includes('doctor')) {
          // Backend still returns "doctors only" — show better message
          userMsg = isAr
            ? 'خطأ في الصلاحيات. يرجى التواصل مع الدعم الفني.'
            : 'Authorization error. Please contact technical support.';
        } else if (response.status === 400) {
          userMsg = isAr
            ? `خطأ في البيانات: ${rawMsg || 'تحقق من التواريخ المدخلة'}`
            : `Data error: ${rawMsg || 'Check the entered dates'}`;
        } else {
          userMsg = isAr
            ? 'حدث خطأ أثناء توليد المواعيد. حاول مرة أخرى.'
            : 'An error occurred while generating slots. Please try again.';
        }

        setFeedback({ type: 'error', msg: userMsg });
        if (onError) onError(userMsg);
      }
    } catch (err) {
      const msg = isAr
        ? 'تعذّر الاتصال بالخادم. تأكد من الاتصال وحاول مرة أخرى.'
        : 'Could not connect to server. Check your connection and try again.';
      setFeedback({ type: 'error', msg });
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span>
          {isAr ? 'توليد مواعيد الطبيب' : 'Generate Slots for Doctor'}
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-hint)' }}>
          {isAr
            ? 'توليد تلقائي للمواعيد بناءً على جدول الطبيب المحدد'
            : 'Auto-generate slots based on the selected doctor schedule'}
        </p>
      </div>

      {/* Date inputs */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {/* FROM */}
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-hint)', marginBottom: '6px' }}>
            {isAr ? 'من' : 'From'}
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={handleFromChange}
            min="2020-01-01"
            max={maxDateStr()}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '10px',
              border: `1px solid ${errors.length > 0 && !fromDate ? '#DC2626' : 'var(--border-base)'}`,
              fontSize: '13px',
              background: 'var(--bg-page)',
              color: 'var(--text-body)',
              fontFamily: "'Cairo', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* TO */}
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-hint)', marginBottom: '6px' }}>
            {isAr ? 'إلى' : 'To'}
          </label>
          <input
            type="date"
            value={toDate}
            onChange={handleToChange}
            min={fromDate || todayStr()}
            max={maxDateStr()}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '10px',
              border: `1px solid ${errors.length > 0 && !toDate ? '#DC2626' : 'var(--border-base)'}`,
              fontSize: '13px',
              background: 'var(--bg-page)',
              color: 'var(--text-body)',
              fontFamily: "'Cairo', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div
          style={{
            background: '#FEF2F2',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            borderLeft: isAr ? 'none' : '3px solid #DC2626',
            borderRight: isAr ? '3px solid #DC2626' : 'none',
          }}
        >
          {errors.map((err, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0', fontSize: '12px', color: '#DC2626', lineHeight: 1.5 }}>
              ⚠ {err}
            </p>
          ))}
        </div>
      )}

      {/* API feedback */}
      {feedback && (
        <div
          style={{
            background: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '13px',
            color: feedback.type === 'success' ? '#059669' : '#DC2626',
            lineHeight: 1.5,
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '10px 16px',
          borderRadius: '10px',
          background: loading ? 'var(--border-base)' : 'var(--primary, #0E7490)',
          color: loading ? 'var(--text-hint)' : '#fff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 700,
          fontFamily: "'Cairo', sans-serif",
          transition: 'opacity 0.15s',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseOver={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
        onMouseOut={(e) => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            {isAr ? 'جاري التوليد...' : 'Generating...'}
          </>
        ) : (
          <>
            <span>⚡</span>
            {isAr ? 'توليد المواعيد' : 'Generate Slots'}
          </>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

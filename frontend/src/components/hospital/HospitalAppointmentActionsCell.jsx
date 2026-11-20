/**
 * HospitalAppointmentActionsCell.jsx — Bug #7 Fix
 * ─────────────────────────────────────────────────────────────────
 * Adds an "Actions" column to the Hospital Appointments table.
 *
 * PROBLEM FIXED:
 *   Before: The appointments table was Read-Only — hospital admin
 *           could see appointments but had no way to confirm, reject,
 *           or move them back to pending from the table.
 *   After:  Each row has context-aware action buttons:
 *           • pending   → "تأكيد" (Confirm) + "رفض" (Reject)
 *           • confirmed → "تحويل لانتظار" (Move to Pending)
 *           • completed / cancelled / rejected / no_show → no actions (read-only)
 *
 * HOW TO USE — two options:
 *
 * ── Option A: Add an Actions column to your existing <Table> ──────
 *
 *   import HospitalAppointmentActionsCell from
 *     '../../components/hospital/HospitalAppointmentActionsCell';
 *
 *   // In your columns array, append:
 *   const columns = [
 *     // ...your existing columns...
 *     {
 *       key: 'actions',
 *       header: isAr ? 'الإجراءات' : 'Actions',
 *       align: 'center',
 *       render: (_, appointment) => (
 *         <HospitalAppointmentActionsCell
 *           appointment={appointment}
 *           language={currentLanguage}
 *           onStatusChange={(id, newStatus) => {
 *             // Update your local state after success, e.g.:
 *             setAppointments(prev =>
 *               prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
 *             );
 *           }}
 *         />
 *       ),
 *     },
 *   ];
 *
 * ── Option B: Use the standalone HospitalAppointmentsTable ────────
 *
 *   import HospitalAppointmentsTable from
 *     '../../components/hospital/HospitalAppointmentActionsCell';
 *   // re-exported as named export — see bottom of this file
 *
 *   <HospitalAppointmentsTable
 *     appointments={appointments}
 *     language={currentLanguage}
 *     loading={isLoading}
 *     onRefresh={() => refetchAppointments()}
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { API } from '../../constants/apiRoutes';

// ── Status definitions ────────────────────────────────────────────
// Maps every known status to its display config
const STATUS_CONFIG = {
  pending:   { bg: '#FEF3C7', color: '#D97706', dot: '#F59E0B', ar: 'قيد الانتظار',   en: 'Pending'   },
  confirmed: { bg: '#D1FAE5', color: '#059669', dot: '#10B981', ar: 'مؤكد',            en: 'Confirmed' },
  cancelled: { bg: '#FEE2E2', color: '#DC2626', dot: '#EF4444', ar: 'ملغي',            en: 'Cancelled' },
  completed: { bg: '#DBEAFE', color: '#2563EB', dot: '#3B82F6', ar: 'مكتمل',           en: 'Completed' },
  rejected:  { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444', ar: 'مرفوض',           en: 'Rejected'  },
  no_show:   { bg: '#FEF3C7', color: '#B45309', dot: '#F59E0B', ar: 'لم يحضر',         en: 'No Show'   },
};

// Statuses where no action is possible (read-only rows)
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'rejected', 'no_show']);

// ── API call ──────────────────────────────────────────────────────
/**
 * Bug #7 Fix — Appointment Status Update
 *
 * The backend now exposes:
 *   PATCH /api/v1/appointments/<id>/status/
 *   Body: { status: 'confirmed' | 'rejected' | 'pending' }
 *
 * This endpoint routes internally to the correct workflow action:
 *   confirmed → POST /confirm/
 *   rejected  → POST /reject/
 *   pending   → POST /cancel/  (revert from confirmed)
 *
 * Also supported as direct action endpoints:
 *   POST /api/v1/appointments/<id>/confirm/
 *   POST /api/v1/appointments/<id>/reject/
 */
async function updateAppointmentStatus(appointmentId, newStatus) {
  // Primary: unified /status/ PATCH (uses apiClient for auto token refresh)
  try {
    const res = await apiClient.patch(`/appointments/${appointmentId}/status/`, { status: newStatus });
    return res.data?.data || res.data;
  } catch (err) {
    // Fallback to direct action endpoints if /status/ not found
    if (err?.response?.status === 404 && (newStatus === 'confirmed' || newStatus === 'rejected')) {
      const url = newStatus === 'confirmed'
        ? API.APPOINTMENTS.CONFIRM(appointmentId)
        : API.APPOINTMENTS.REJECT(appointmentId);
      try {
        const fallback = await apiClient.post(url);
        return fallback.data?.data || fallback.data;
      } catch (fallbackErr) {
        const msg =
          fallbackErr?.errorDetail ||
          fallbackErr?.response?.data?.error?.message ||
          fallbackErr?.response?.data?.detail ||
          fallbackErr?.message ||
          `HTTP ${fallbackErr?.response?.status || 'unknown'}`;
        throw new Error(msg);
      }
    }
    const msg =
      err?.errorDetail ||
      err?.response?.data?.error?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      `HTTP ${err?.response?.status || 'unknown'}`;
    throw new Error(msg);
  }
}

// ── Small inline status badge ─────────────────────────────────────
function InlineStatusBadge({ status, isAr }) {
  const cfg = STATUS_CONFIG[status] || { bg: '#F1F5F9', color: 'var(--text-muted)', dot: 'var(--text-hint)', ar: status, en: status };
  const label = isAr ? cfg.ar : cfg.en;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: cfg.bg,
      color: cfg.color,
      borderRadius: 20,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ── Single action button ──────────────────────────────────────────
function ActionButton({ label, onClick, variant = 'primary', loading = false, disabled = false }) {
  const VARIANTS = {
    confirm: { bg: '#D1FAE5', color: '#065F46', hoverBg: '#A7F3D0', border: '#6EE7B7' },
    reject:  { bg: '#FEE2E2', color: '#991B1B', hoverBg: '#FECACA', border: '#FCA5A5' },
    pending: { bg: '#FEF3C7', color: '#92400E', hoverBg: '#FDE68A', border: '#FCD34D' },
  };
  const v = VARIANTS[variant] || VARIANTS.confirm;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); if (!disabled && !loading) onClick(); }}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 12px',
        background: hovered && !disabled ? v.hoverBg : v.bg,
        color: v.color,
        border: `1.5px solid ${v.border}`,
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {loading ? (
        <span style={{
          display: 'inline-block',
          width: 10, height: 10,
          border: `2px solid ${v.color}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      ) : null}
      {label}
    </button>
  );
}

// ── Inline error / success toast ──────────────────────────────────
function InlineToast({ message, type = 'error' }) {
  if (!message) return null;
  const colors = type === 'error'
    ? { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
    : { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' };
  return (
    <div style={{
      marginTop: 4,
      padding: '4px 8px',
      background: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      fontSize: 11,
      maxWidth: 200,
    }}>
      {message}
    </div>
  );
}

// ── Main export: Actions cell ─────────────────────────────────────

/**
 * Drop this into a table column's render function.
 *
 * Props:
 *   appointment   — the appointment object ({ id, status, ... })
 *   language      — 'ar' | 'en'
 *   onStatusChange(id, newStatus) — called after successful PATCH
 */
export default function HospitalAppointmentActionsCell({
  appointment,
  language = 'ar',
  onStatusChange,
}) {
  const isAr = language === 'ar';
  const status = (appointment?.status || 'pending').toLowerCase();
  const isTerminal = TERMINAL_STATUSES.has(status);

  const [loadingAction, setLoadingAction] = useState(null); // 'confirm' | 'reject' | 'pending'
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  // Optimistic local status so the row updates immediately
  const [localStatus, setLocalStatus] = useState(status);

  const doAction = async (newStatus, actionKey) => {
    setLoadingAction(actionKey);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateAppointmentStatus(appointment.id, newStatus);

      // Optimistic update
      setLocalStatus(newStatus);

      const msgMap = {
        confirmed: isAr ? 'تم تأكيد الموعد ✓'         : 'Appointment confirmed ✓',
        rejected:  isAr ? 'تم رفض الموعد ✓'            : 'Appointment rejected ✓',
        pending:   isAr ? 'تم تحويله لـ "قيد الانتظار" ✓' : 'Moved to pending ✓',
      };
      setSuccessMsg(msgMap[newStatus] || '✓');
      setTimeout(() => setSuccessMsg(null), 2500);

      if (onStatusChange) onStatusChange(appointment.id, newStatus);
    } catch (err) {
      setError(
        isAr
          ? `فشل تحديث الحالة: ${err.message}`
          : `Failed to update: ${err.message}`
      );
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoadingAction(null);
    }
  };

  // ── Terminal status — display only ───────────────────────────────
  if (isTerminal || TERMINAL_STATUSES.has(localStatus)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <InlineStatusBadge status={localStatus} isAr={isAr} />
      </div>
    );
  }

  const isBusy = loadingAction !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* ── Pending row: Confirm + Reject ── */}
        {localStatus === 'pending' && (
          <>
            <ActionButton
              label={isAr ? '✓ تأكيد' : '✓ Confirm'}
              variant="confirm"
              loading={loadingAction === 'confirm'}
              disabled={isBusy}
              onClick={() => doAction('confirmed', 'confirm')}
            />
            <ActionButton
              label={isAr ? '✕ رفض' : '✕ Reject'}
              variant="reject"
              loading={loadingAction === 'reject'}
              disabled={isBusy}
              onClick={() => doAction('rejected', 'reject')}
            />
          </>
        )}

        {/* ── Confirmed row: Move back to Pending ── */}
        {localStatus === 'confirmed' && (
          <ActionButton
            label={isAr ? '↩ تحويل لانتظار' : '↩ Move to Pending'}
            variant="pending"
            loading={loadingAction === 'pending'}
            disabled={isBusy}
            onClick={() => doAction('pending', 'pending')}
          />
        )}
      </div>

      {/* Inline feedback */}
      {error      && <InlineToast message={error}      type="error"   />}
      {successMsg && <InlineToast message={successMsg} type="success" />}

      {/* CSS keyframe for spinner — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ── Option B: Full standalone table ──────────────────────────────
// ─────────────────────────────────────────────────────────────────

/**
 * HospitalAppointmentsTable
 *
 * A fully self-contained appointments table with the actions column built-in.
 * Use this if you prefer to drop a single component rather than wiring a column.
 *
 * Props:
 *   appointments  — array of appointment objects
 *   language      — 'ar' | 'en'
 *   loading       — boolean
 *   onRefresh()   — called after any status change to refetch data
 */
export function HospitalAppointmentsTable({
  appointments = [],
  language = 'ar',
  loading = false,
  onRefresh,
}) {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  // Local copy so we can optimistically update rows
  const [rows, setRows] = useState(appointments);

  // Sync if parent passes new data
  React.useEffect(() => {
    setRows(appointments);
  }, [appointments]);

  const handleStatusChange = (id, newStatus) => {
    setRows(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    if (onRefresh) onRefresh();
  };

  const t = {
    doctor:   isAr ? 'الطبيب'    : 'Doctor',
    date:     isAr ? 'التاريخ'   : 'Date',
    time:     isAr ? 'الوقت'     : 'Time',
    status:   isAr ? 'الحالة'    : 'Status',
    actions:  isAr ? 'الإجراءات' : 'Actions',
    noData:   isAr ? 'لا توجد مواعيد'                     : 'No appointments found',
    loading:  isAr ? 'جاري التحميل...'                    : 'Loading...',
  };

  if (loading) {
    return (
      <div dir={dir} style={{ padding: 40, textAlign: 'center', color: 'var(--text-hint)', fontSize: 14 }}>
        {t.loading}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div dir={dir} style={{ padding: 40, textAlign: 'center', color: 'var(--text-hint)', fontSize: 14 }}>
        📋 {t.noData}
      </div>
    );
  }

  // Column header style
  const th = {
    padding: '11px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: '#F8FAFC',
    borderBottom: '2px solid #E2E8F0',
    whiteSpace: 'nowrap',
  };

  // Cell style
  const td = {
    padding: '13px 16px',
    fontSize: 13,
    color: '#334155',
    verticalAlign: 'middle',
    borderBottom: '1px solid #F1F5F9',
  };

  const formatDate = (appt) => {
    const raw = appt.slot_start || appt.date || appt.appointment_date || '';
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return raw; }
  };

  const formatTime = (appt) => {
    const raw = appt.slot_start || appt.time || appt.appointment_time || '';
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return raw; }
  };

  const getDoctorName = (appt) =>
    appt.doctor?.full_name ||
    appt.doctor?.name ||
    appt.doctor_name ||
    appt.doctorName ||
    '—';

  return (
    <div
      dir={dir}
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: isAr ? 'right' : 'left' }}>{t.doctor}</th>
              <th style={{ ...th, textAlign: isAr ? 'right' : 'left' }}>{t.date}</th>
              <th style={{ ...th, textAlign: isAr ? 'right' : 'left' }}>{t.time}</th>
              <th style={{ ...th, textAlign: 'center' }}>{t.status}</th>
              <th style={{ ...th, textAlign: 'center' }}>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((appt, idx) => (
              <tr
                key={appt.id ?? idx}
                style={{ transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Doctor */}
                <td style={{ ...td, textAlign: isAr ? 'right' : 'left', fontWeight: 600 }}>
                  {getDoctorName(appt)}
                </td>

                {/* Date */}
                <td style={{ ...td, textAlign: isAr ? 'right' : 'left' }}>
                  {formatDate(appt)}
                </td>

                {/* Time */}
                <td style={{ ...td, textAlign: isAr ? 'right' : 'left' }}>
                  {formatTime(appt)}
                </td>

                {/* Status badge */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <InlineStatusBadge status={(appt.status || 'pending').toLowerCase()} isAr={isAr} />
                </td>

                {/* Actions */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <HospitalAppointmentActionsCell
                    appointment={appt}
                    language={language}
                    onStatusChange={handleStatusChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

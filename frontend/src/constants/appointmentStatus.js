/**
 * CuraBook — Appointment Status Constants
 * =========================================
 * FIX: appointmentStatus.js was MISSING — referenced throughout the frontend but never created.
 * Source of truth for status values, labels, colours, and valid transitions.
 *
 * Backend: appointments/models.py → Appointment.Status
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status values (match backend TextChoices exactly)
// ─────────────────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUS = {
  PENDING:               'PENDING',
  CONFIRMED:             'CONFIRMED',
  REJECTED:              'REJECTED',
  CANCELLED:             'CANCELLED',
  COMPLETED:             'COMPLETED',
  RESCHEDULE_REQUESTED:  'RESCHEDULE_REQUESTED',
  NO_SHOW:               'NO_SHOW',   // Added: BUG-04 fix
};

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable labels
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]:              'Pending',
  [APPOINTMENT_STATUS.CONFIRMED]:            'Confirmed',
  [APPOINTMENT_STATUS.REJECTED]:             'Rejected',
  [APPOINTMENT_STATUS.CANCELLED]:            'Cancelled',
  [APPOINTMENT_STATUS.COMPLETED]:            'Completed',
  [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED]: 'Reschedule Requested',
  [APPOINTMENT_STATUS.NO_SHOW]:              'No Show',
};

// ─────────────────────────────────────────────────────────────────────────────
// Design-token colours (matches tokens.js palette)
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  [APPOINTMENT_STATUS.PENDING]:              { bg: '#FFF7E6', text: '#D97706', border: '#FCD34D' },
  [APPOINTMENT_STATUS.CONFIRMED]:            { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' },
  [APPOINTMENT_STATUS.REJECTED]:             { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  [APPOINTMENT_STATUS.CANCELLED]:            { bg: 'var(--bg-page)', text: 'var(--text-muted)', border: '#D1D5DB' },
  [APPOINTMENT_STATUS.COMPLETED]:            { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' },
  [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED]: { bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' },
  [APPOINTMENT_STATUS.NO_SHOW]:              { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Valid status transitions per role
// Used by statusMachine.js to guard UI actions
// ─────────────────────────────────────────────────────────────────────────────
export const VALID_TRANSITIONS = {
  // What a DOCTOR can do
  doctor: {
    [APPOINTMENT_STATUS.PENDING]:              [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REJECTED],
    [APPOINTMENT_STATUS.CONFIRMED]:            [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
    [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REJECTED],
  },
  // What a PATIENT can do
  patient: {
    [APPOINTMENT_STATUS.PENDING]:   [APPOINTMENT_STATUS.CANCELLED],
    [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.RESCHEDULE_REQUESTED],
  },
  // What an ASSISTANT can do (same as doctor)
  assistant: {
    [APPOINTMENT_STATUS.PENDING]:              [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REJECTED],
    [APPOINTMENT_STATUS.CONFIRMED]:            [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
    [APPOINTMENT_STATUS.RESCHEDULE_REQUESTED]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REJECTED],
  },
};

/**
 * Returns true if a role can perform a transition from currentStatus to targetStatus.
 * @param {string} role - 'doctor' | 'patient' | 'assistant'
 * @param {string} currentStatus - current appointment status
 * @param {string} targetStatus - desired new status
 */
export function canTransition(role, currentStatus, targetStatus) {
  const allowed = VALID_TRANSITIONS[role]?.[currentStatus] ?? [];
  return allowed.includes(targetStatus);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: is the appointment in a terminal state?
// ─────────────────────────────────────────────────────────────────────────────
export const TERMINAL_STATUSES = new Set([
  APPOINTMENT_STATUS.REJECTED,
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.NO_SHOW,
]);

export function isTerminal(status) {
  return TERMINAL_STATUSES.has(status);
}

export default APPOINTMENT_STATUS;

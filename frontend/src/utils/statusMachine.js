/**
 * CuraBook — Appointment Status Machine
 * ======================================
 * FIX: statusMachine.js was MISSING.
 * Provides a clean interface for UI components to check what actions are
 * available to the current user on any appointment.
 */

import {
  APPOINTMENT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  VALID_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransition,
  isTerminal,
} from '../constants/appointmentStatus';
import { normalizeStatus } from './normalizeStatus';

// ─────────────────────────────────────────────────────────────────────────────
// Internal: convert any status string (lowercase OR UPPERCASE) to the UPPERCASE
// key used in APPOINTMENT_STATUS / VALID_TRANSITIONS.
// Backend sends UPPERCASE; normalizeStatus() returns lowercase; this bridges both.
// ─────────────────────────────────────────────────────────────────────────────
function toUpperStatus(status) {
  if (!status) return APPOINTMENT_STATUS.PENDING;
  const s = String(status).toUpperCase();
  // If it's already a valid APPOINTMENT_STATUS value, return it directly
  if (Object.values(APPOINTMENT_STATUS).includes(s)) return s;
  // Otherwise map via normalizeStatus then back to UPPERCASE
  const norm = normalizeStatus(status);      // e.g. 'reschedule_requested'
  return norm.toUpperCase();                 // e.g. 'RESCHEDULE_REQUESTED'
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Definitions
// ─────────────────────────────────────────────────────────────────────────────
const ACTIONS = {
  CONFIRM:   { id: 'confirm',   label: 'Confirm',    targetStatus: APPOINTMENT_STATUS.CONFIRMED,  variant: 'success' },
  REJECT:    { id: 'reject',    label: 'Reject',     targetStatus: APPOINTMENT_STATUS.REJECTED,   variant: 'danger' },
  CANCEL:    { id: 'cancel',    label: 'Cancel',     targetStatus: APPOINTMENT_STATUS.CANCELLED,  variant: 'warning' },
  COMPLETE:  { id: 'complete',  label: 'Complete',   targetStatus: APPOINTMENT_STATUS.COMPLETED,  variant: 'primary' },
  NO_SHOW:   { id: 'no_show',   label: 'No Show',    targetStatus: APPOINTMENT_STATUS.NO_SHOW,    variant: 'warning' },
  RESCHEDULE:{ id: 'reschedule',label: 'Reschedule', targetStatus: APPOINTMENT_STATUS.RESCHEDULE_REQUESTED, variant: 'secondary' },
  APPROVE_RESCHEDULE: { id: 'approve_reschedule', label: 'Approve Reschedule', targetStatus: APPOINTMENT_STATUS.CONFIRMED, variant: 'success' },
  REJECT_RESCHEDULE:  { id: 'reject_reschedule',  label: 'Reject Reschedule',  targetStatus: APPOINTMENT_STATUS.REJECTED,  variant: 'danger' },
};

// Map targetStatus → action for lookup
const TARGET_TO_ACTION = Object.values(ACTIONS).reduce((acc, action) => {
  acc[action.targetStatus] = acc[action.targetStatus] || [];
  acc[action.targetStatus].push(action);
  return acc;
}, {});

/**
 * Get available UI actions for an appointment based on role and current status.
 * FIX HIGH-03: normalizes status to UPPERCASE before VALID_TRANSITIONS lookup
 * so both 'PENDING' and 'pending' (from normalizeStatus) work correctly.
 *
 * @param {string} role - 'doctor' | 'patient' | 'assistant'
 * @param {string} currentStatus - current appointment status (any case)
 * @returns {Array<{id, label, targetStatus, variant}>}
 */
export function getAvailableActions(role, currentStatus) {
  const status = toUpperStatus(currentStatus);

  if (isTerminal(status)) return [];

  const allowedTargets = VALID_TRANSITIONS[role]?.[status] ?? [];

  // For RESCHEDULE_REQUESTED status, use approve/reject reschedule labels
  if (status === APPOINTMENT_STATUS.RESCHEDULE_REQUESTED && (role === 'doctor' || role === 'assistant')) {
    return [ACTIONS.APPROVE_RESCHEDULE, ACTIONS.REJECT_RESCHEDULE];
  }

  return allowedTargets.flatMap((target) => {
    const actions = TARGET_TO_ACTION[target] || [];
    // Filter reschedule approve/reject from normal flow
    return actions.filter(a => a.id !== 'approve_reschedule' && a.id !== 'reject_reschedule');
  });
}

/**
 * Returns badge styling for a status.
 * FIX HIGH-03: normalizes status before lookup.
 * @param {string} status
 * @returns {{ bg: string, text: string, border: string }}
 */
export function getStatusStyle(status) {
  const s = toUpperStatus(status);
  return STATUS_COLORS[s] ?? STATUS_COLORS[APPOINTMENT_STATUS.PENDING];
}

/**
 * Returns human-readable label for a status.
 * FIX HIGH-03: normalizes status before lookup.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  const s = toUpperStatus(status);
  return STATUS_LABELS[s] ?? status;
}

// Re-export for convenience
export {
  APPOINTMENT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  canTransition,
  isTerminal,
  TERMINAL_STATUSES,
};

export default {
  getAvailableActions,
  getStatusStyle,
  getStatusLabel,
  canTransition,
  isTerminal,
};

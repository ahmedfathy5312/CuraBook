/**
 * normalizeStatus.js
 * FIX S2-9: Backend returns RESCHEDULE_REQUESTED (uppercase snake_case).
 * Frontend status maps use lowercase keys. This utility bridges the gap.
 *
 * Usage:
 *   import { normalizeStatus } from '../utils/normalizeStatus';
 *   const key = normalizeStatus(appointment.status); // → 'reschedule_requested'
 */

/** Map of every known backend status → normalized frontend key */
const STATUS_MAP = {
  // Standard statuses
  PENDING:               'pending',
  CONFIRMED:             'confirmed',
  REJECTED:              'rejected',
  CANCELLED:             'cancelled',
  COMPLETED:             'completed',
  NO_SHOW:               'no_show',
  // Reschedule flow
  RESCHEDULE_REQUESTED:  'reschedule_requested',
  RESCHEDULE_APPROVED:   'confirmed',   // treated as confirmed once approved
  RESCHEDULE_REJECTED:   'rejected',
};

/**
 * Normalize any backend status string to the lowercase key used in status maps.
 * Falls back to lowercase of the original string if not in map.
 * @param {string} status - Raw status from backend (e.g. "RESCHEDULE_REQUESTED")
 * @returns {string} Normalized key (e.g. "reschedule_requested")
 */
export function normalizeStatus(status) {
  if (!status) return 'pending';
  const upper = String(status).toUpperCase();
  return STATUS_MAP[upper] ?? String(status).toLowerCase();
}

/**
 * Returns true if the status is a terminal state (no further transitions possible).
 * @param {string} status - Raw or normalized status
 */
export function isTerminalStatus(status) {
  const norm = normalizeStatus(status);
  return ['completed', 'cancelled', 'rejected', 'no_show'].includes(norm);
}

/**
 * Human-readable label for any status.
 * @param {string} status
 * @returns {string}
 */
export function statusLabel(status) {
  const LABELS = {
    pending:               'Pending',
    confirmed:             'Confirmed',
    rejected:              'Rejected',
    cancelled:             'Cancelled',
    completed:             'Completed',
    no_show:               'No Show',
    reschedule_requested:  'Reschedule Requested',
    reschedule_approved:   'Reschedule Approved',
    reschedule_rejected:   'Reschedule Rejected',
  };
  return LABELS[normalizeStatus(status)] ?? status;
}

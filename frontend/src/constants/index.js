/**
 * constants/index.js — Centralized constants barrel export
 */

// Role definitions
export * from '../config/roles';

// Route constants
export * from '../config/routes';

// API Route constants
export * from './apiRoutes';

// Appointment statuses
export const APPOINTMENT_STATUS = {
  PENDING:              'PENDING',              // FIX #3: backend uses UPPERCASE
  CONFIRMED:            'CONFIRMED',
  CANCELLED:            'CANCELLED',
  COMPLETED:            'COMPLETED',
  REJECTED:             'REJECTED',
  NO_SHOW:              'NO_SHOW',
  RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED', // FIX #3: added — backend has this status
};

export const APPOINTMENT_STATUS_LABELS = {
  PENDING:              'Pending',
  CONFIRMED:            'Confirmed',
  CANCELLED:            'Cancelled',
  COMPLETED:            'Completed',
  REJECTED:             'Rejected',
  NO_SHOW:              'No Show',
  RESCHEDULE_REQUESTED: 'Reschedule Requested',
};

export const APPOINTMENT_STATUS_COLORS = {
  PENDING:              '#F59E0B',
  CONFIRMED:            '#31A870',
  CANCELLED:            '#E97D61',
  COMPLETED:            'var(--primary)',
  REJECTED:             '#EF4444',
  NO_SHOW:              '#9CA3AF',
  RESCHEDULE_REQUESTED: '#8B5CF6',
};

// WS Event types
export const WS_EVENTS = {
  NEW_APPOINTMENT:      'NEW_APPOINTMENT',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_REJECTED: 'APPOINTMENT_REJECTED',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  NEW_NOTIFICATION:     'NEW_NOTIFICATION',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  TABLE_PAGE_SIZE:   20,
};

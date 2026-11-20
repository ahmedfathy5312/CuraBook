/**
 * config/roles.js — Role definitions and permissions
 */

export const ROLES = {
  PATIENT:   'patient',
  DOCTOR:    'doctor',
  HOSPITAL:  'hospital',
  ADMIN:     'admin',
  ASSISTANT: 'assistant',
  GUEST:     'guest',
};

/** Where each role goes after login */
export const ROLE_HOME = {
  [ROLES.PATIENT]:   '/dashboard',        // FIX H-08: was '/profile' — patient dashboard is at /dashboard
  [ROLES.DOCTOR]:    '/doctor-dashboard',
  [ROLES.HOSPITAL]:  '/hospital-dashboard',
  [ROLES.ADMIN]:     '/admin-dashboard',
  [ROLES.ASSISTANT]: '/assistant-dashboard',
  [ROLES.GUEST]:     '/',
};

/** Human-readable role labels */
export const ROLE_LABELS = {
  [ROLES.PATIENT]:   'Patient',
  [ROLES.DOCTOR]:    'Doctor',
  [ROLES.HOSPITAL]:  'Hospital',
  [ROLES.ADMIN]:     'Admin',
  [ROLES.ASSISTANT]: 'Assistant',
  [ROLES.GUEST]:     'Guest',
};

/** Role-based permissions */
export const PERMISSIONS = {
  canBookAppointment:    [ROLES.PATIENT],
  // FIX HIGH-09: VALID_TRANSITIONS.doctor includes CONFIRMED as a target from PENDING,
  // meaning doctors CAN approve/confirm appointments — not just assistants.
  canApproveAppointment: [ROLES.ASSISTANT, ROLES.DOCTOR],
  canManageDoctors:      [ROLES.HOSPITAL, ROLES.ADMIN],
  canManagePatients:     [ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN],
  canViewAnalytics:      [ROLES.HOSPITAL, ROLES.ADMIN],
  canManageSystem:       [ROLES.ADMIN],
  canViewPrescriptions:  [ROLES.PATIENT, ROLES.DOCTOR],
};

export const hasPermission = (role, permission) =>
  (PERMISSIONS[permission] || []).includes(role);

export default ROLES;

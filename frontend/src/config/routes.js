/**
 * config/routes.js — Centralized route definitions
 * Prevents hardcoded strings scattered across components.
 */

export const ROUTES = {
  // Public
  HOME:             '/',
  LOGIN:            '/login',
  JOIN:             '/join',
  SIGNUP:           '/signup',
  DOCTOR_SIGNUP:    '/doctor-signup',
  HOSPITAL_SIGNUP:  '/hospital-signup',
  ASSISTANT_SIGNUP: '/assistant-signup',
  ABOUT:            '/about-us',
  CONTACT:          '/contact-us',
  FORGOT_PASSWORD:  '/forgot-password',
  UNAUTHORIZED:     '/unauthorized',

  // Patient
  PATIENT_PROFILE:      '/profile',
  PATIENT_EDIT:         '/edit-profile',
  PATIENT_APPOINTMENTS: '/appointments',
  APPOINTMENT_DETAIL:   (id) => `/appointments/${id}`,
  DOCTORS:              '/doctors',
  DOCTOR_PROFILE:       (id) => `/doctors/${id}`,
  HOSPITALS:            '/hospitals',
  HOSPITAL_DETAIL:      (id) => `/hospitals/${id}`,
  PRESCRIPTIONS:        '/prescriptions',
  NOTIFICATIONS:        '/notifications',

  // Doctor
  DOCTOR_DASHBOARD:     '/doctor-dashboard',
  PATIENT_MANAGEMENT:   '/patient-management',
  NEW_PATIENT_RECORD:   '/new-patient-record',
  PATIENT_RECORD:       (id) => `/patient-record-details/${id}`,
  DOCTOR_APPOINTMENTS:  '/patient-appointments',  // FIX M-03: was PATIENT_APPOINTMENTS (duplicate key — overwrote patient's route)
  PROFILE_SETTINGS:     '/profile-settings',
  PROFILE_PAGE:         '/profile-page',
  DOCTOR_PRESCRIPTIONS: '/doctor-prescriptions',

  // Hospital
  HOSPITAL_DASHBOARD:   '/hospital-dashboard',
  MANAGE_DOCTORS:       '/manage-doctors',
  MANAGE_PATIENTS:      '/manage-patients',
  MANAGE_ASSISTANTS:    '/manage-assistants',

  // Assistant
  ASSISTANT_DASHBOARD:  '/assistant-dashboard',

  // Admin
  ADMIN_DASHBOARD:      '/admin-dashboard',
};

export default ROUTES;

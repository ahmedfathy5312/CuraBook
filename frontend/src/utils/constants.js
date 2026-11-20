export const ROLES = {
  PATIENT:   'patient',
  DOCTOR:    'doctor',
  HOSPITAL:  'hospital',
  ADMIN:     'admin',
  ASSISTANT: 'assistant',
  GUEST:     'guest',
};

export const ROLE_HOME = {
  patient:   '/profile',
  doctor:    '/doctor-dashboard',
  hospital:  '/hospital-dashboard',
  admin:     '/admin-dashboard',
  assistant: '/assistant-dashboard',
  guest:     '/',
};

export const APPOINTMENT_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  REJECTED:  'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const WS_EVENTS = {
  NEW_APPOINTMENT:      'NEW_APPOINTMENT',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_REJECTED: 'APPOINTMENT_REJECTED',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  NEW_NOTIFICATION:     'NEW_NOTIFICATION',
};

export const QUERY_KEYS = {
  ME:                     ['auth', 'me'],
  DOCTORS_SEARCH:         'doctors-search',
  DOCTOR_PROFILE:         'doctor-profile',
  DOCTOR_AVAILABILITY:    'doctor-availability',
  DOCTOR_REVIEWS:         'doctor-reviews',
  MY_APPOINTMENTS:        ['appointments', 'mine'],
  ALL_APPOINTMENTS:       ['appointments', 'all'],
  NOTIFICATIONS:          ['notifications'],
  ADMIN_STATS:            ['admin', 'stats'],
  ADMIN_HOSPITALS:        ['admin', 'hospitals'],
  ADMIN_DOCTORS:          ['admin', 'doctors'],
  ADMIN_PATIENTS:         ['admin', 'patients'],
  ADMIN_AUDIT:            ['admin', 'audit'],
  HOSPITAL_OVERVIEW:      ['hospital', 'overview'],
  HOSPITAL_DOCTORS:       ['hospital', 'doctors'],
  DOCTOR_SCHEDULE:        ['doctor', 'schedule'],
};

export const SPECIALIZATIONS = [
  'Cardiology','Dermatology','ENT','Gastroenterology',
  'General Practice','Gynecology','Neurology','Oncology',
  'Ophthalmology','Orthopedics','Pediatrics','Psychiatry',
  'Pulmonology','Radiology','Surgery','Urology',
];

export const EGYPT_CITIES = [
  'Cairo','Alexandria','Giza','Assuit','Luxor',
  'Aswan','Port Said','Suez','Mansoura','Tanta',
  'Zagazig','Ismailia','Fayoum','Minya','Sohag',
];

export const PAGE_SIZE = 12;

// App-level config
export const APP_CONFIG = {
  APP_NAME: 'CuraBook',
  API_BASE_URL: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/v1',
  WS_BASE_URL:  import.meta.env.VITE_WS_URL || import.meta.env.REACT_APP_WS_URL || 'ws://127.0.0.1:8000/ws',
  TOKEN_REFRESH_ENDPOINT: '/users/token/refresh/',
  ME_ENDPOINT: '/users/me/',
};

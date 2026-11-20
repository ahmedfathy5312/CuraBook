/**
 * constants/apiRoutes.js — Centralized API Route Constants
 *
 * ALL endpoint paths are defined here.
 * Never hard-code API paths in services or components.
 * The base URL (/api/v1) is already added by apiClient.js.
 */

export const API = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN:             '/auth/login/',
    REGISTER:          '/auth/register/',
    REGISTER_DOCTOR:     '/auth/register/doctor/',
    REGISTER_HOSPITAL:   '/auth/register/hospital/',
    REGISTER_ASSISTANT:  '/auth/register/assistant/',
    REFRESH:           '/auth/token/refresh/',
    LOGOUT:            '/auth/logout/',
    FORGOT_PASSWORD:          '/auth/password-reset/',
    RESET_PASSWORD_VERIFY:    '/auth/password-reset/verify/',
    RESET_PASSWORD:    '/auth/password-reset/confirm/',
    VERIFY_TOKEN:         '/auth/token/verify/',
    VERIFY_EMAIL:         '/auth/verify-email/',
    RESEND_VERIFICATION:  '/auth/resend-verification/',
    WS_TICKET:            '/auth/ws-ticket/',          // SEC-01: one-time WS auth ticket
  },

  // ── Users ───────────────────────────────────────────────────────────────────
  USERS: {
    ME:              '/auth/me/',              // FIX #1: was /users/me/ — backend uses /auth/me/
    CHANGE_PASSWORD: '/auth/me/change-password/',
    AVATAR:          '/auth/me/avatar/',
    PATIENT_PROFILE: '/patients/',
    PATIENT_PROFILE_ME: '/patients/me/',  // FIX: PATCH endpoint
    DOCTOR_PROFILE:  '/doctors/',
    MEDICAL_HISTORY: '/patients/medical-history/',
  },

  // ── Doctors ─────────────────────────────────────────────────────────────────
  DOCTORS: {
    LIST:             '/doctors/',
    // HIGH-08 FIX: DOCTORS.SEARCH removed — use API.SEARCH.DOCTORS as the single canonical constant.
    // Both pointed to '/search/doctors/' but having two caused confusion in codebase.
    DETAIL:           (id) => `/doctors/${id}/`,
    PROFILE:          '/doctor/profile/',
    STATS:            '/doctor/stats/',
    APPOINTMENTS:     '/doctor/appointments/',
    APPOINTMENT_DETAIL:  (id) => `/doctor/appointments/${id}/`,    // FIX HIGH-06
    APPOINTMENT_COMPLETE:(id) => `/doctor/appointments/${id}/complete/`, // FIX HIGH-06
    PATIENT_DETAIL:   (id) => `/doctor/patients/${id}/`,           // FIX HIGH-06
    SCHEDULE:         '/doctor/schedule/',
    SCHEDULE_LIST:    '/schedules/',
    SCHEDULE_DETAIL:  (id) => `/schedules/${id}/`,
    GENERATE_SLOTS:   '/schedules/slots/generate/',
    GENERATE_SLOTS_FROM_SCHEDULE: (id) => `/schedules/${id}/generate-slots/`, // MED-04 FIX: was string-concat in scheduleApi.js
    AVAILABILITY:        (id) => `/doctors/${id}/availability/`,
    AVAILABLE_SLOTS:     (id) => `/doctors/${id}/available-slots/`,   // used in BookingPage + HospitalDetailPage
    SPECIALIZATIONS:     '/doctors/specializations/',
    PATIENT_RECORDS:     '/doctor/patient-records/',                   // doctor creates flat patient record (NewPatientRecordPage)
    PATIENT_RECORDS_FOR: (patientId) => `/doctor/patients/${patientId}/records/`,  // BUG #3 FIX: nested records for a specific patient
    PATIENT_RECORD_DETAIL: (patientId, recordId) => `/doctor/patients/${patientId}/records/${recordId}/`, // BUG #3 FIX: PATCH/GET a specific record
    NOTIFICATIONS:       '/doctor/notifications/',                        // P0-BUG-7: notification prefs
    ANALYTICS:           '/doctor/analytics/',                            // P1-FEAT-5: real analytics
    ASSISTANTS:       '/doctor/assistants/',
    NEARBY:           '/doctors/nearby/',
    ASSISTANT_DETAIL: (id) => `/doctor/assistants/${id}/`,
    REVIEWS:          (id) => `/doctors/${id}/reviews/`,
    CAN_REVIEW:       (id) => `/doctors/${id}/can-review/`,
    WORKING_HOURS:    '/doctor/working-hours/',
    TODAY_SCHEDULE:   '/doctor/today-schedule/',
    PATIENTS:         '/doctor/patients/',
  },

  // ── Appointments ─────────────────────────────────────────────────────────────
  APPOINTMENTS: {
    LIST:       '/appointments/',
    DETAIL:     (id) => `/appointments/${id}/`,
    CANCEL:     (id) => `/appointments/${id}/cancel/`,
    CONFIRM:    (id) => `/appointments/${id}/confirm/`,   // assistant or doctor confirms
    REJECT:     (id) => `/appointments/${id}/reject/`,    // assistant or doctor rejects
    COMPLETE:   (id) => `/appointments/${id}/complete/`,  // doctor marks complete
    RESCHEDULE:         (id) => `/appointments/${id}/reschedule/`,
    APPROVE_RESCHEDULE: (id) => `/appointments/${id}/approve-reschedule/`,
    REJECT_RESCHEDULE:  (id) => `/appointments/${id}/reject-reschedule/`,
    NO_SHOW:            (id) => `/appointments/${id}/no-show/`,   // API-C02 FIX: hyphen matches backend url_path='no-show'
  },

  // ── Slots ────────────────────────────────────────────────────────────────────
  SLOTS: {
    LIST:        '/search/slots/',          // FIX #5: was /slots/ — backend uses /search/slots/
    MANAGE:      '/schedules/slots/',       // Doctor managing own slots
    DETAIL:      (id) => `/schedules/slots/${id}/`,
    DEACTIVATE:  (id) => `/schedules/slots/${id}/deactivate/`,  // POST — deactivate a generated slot
    TOGGLE_BLOCK: (id) => `/schedules/slots/${id}/toggle-block/`, // POST — toggle blocked/available
    BLOCK:       (id) => `/schedules/blocked/${id}/`,
    BLOCKED_LIST: '/schedules/blocked/',
    PUBLIC:      '/schedules/public/slots/',
  },

  // ── Assistant ────────────────────────────────────────────────────────────────
  ASSISTANT: {
    APPOINTMENTS: '/assistant/appointments/',
    APPROVE:      (id) => `/appointments/${id}/confirm/`,
    REJECT:       (id) => `/appointments/${id}/reject/`,
    WORKPLACES:   '/assistants/my-workplaces/',
    SCHEDULE:     '/assistant/schedule/',   // HIGH-08 FIX: was '/schedules/' (doctor schedules!) → now /assistant/schedule/
    SHIFTS:       '/assistant/shifts/',     // CRUD endpoint for personal shifts
    SHIFTS_DETAIL:(id) => `/assistant/shifts/${id}/`,
    ANALYTICS:    '/analytics/assistant/',  // BUG-04 FIX: server-side analytics endpoint
    STATS:        '/analytics/assistant/',  // alias for ANALYTICS
    PATIENTS:     '/assistant/patients/',   // HIGH-04 FIX: dedicated patients endpoint
  },

  // ── Hospitals ─────────────────────────────────────────────────────────────────
  HOSPITALS: {
    LIST:         '/hospitals/',
    SEARCH:       '/hospitals/search/',
    DETAIL:       (id) => `/hospitals/${id}/`,
    DOCTORS:      (id) => `/hospitals/${id}/doctors/`,
  },

  // ── Clinics ───────────────────────────────────────────────────────────────────
  CLINICS: {
    LIST:    '/clinics/',
    DETAIL:  (id) => `/clinics/${id}/`,
    DOCTORS: (id) => `/clinics/${id}/doctors/`,
  },

  // ── Hospital Admin ────────────────────────────────────────────────────────────
  HOSPITAL: {
    OVERVIEW:           '/hospital/overview/',
    ANALYTICS:          '/hospital/analytics/',
    APPOINTMENTS:       '/hospital/appointments/',
    DOCTORS:            '/hospital/doctors/',
    DOCTOR_DETAIL:      (id) => `/hospital/doctors/${id}/`,
    DOCTOR_TOGGLE:      (id) => `/hospital/doctors/${id}/`,           // PATCH to toggle doctor active status
    PATIENTS:           '/hospital/patients/',
    ASSISTANTS:         '/hospital/assistants/',
    ASSISTANT_DETAIL:   (id) => `/hospital/assistants/${id}/`,      // HIGH-03 FIX: was hardcoded in hospitalApi.js
    DEPARTMENTS:        '/hospital/departments/',
    DEPARTMENT_DETAIL:  (id) => `/hospital/departments/${id}/`,
    PROFILE:            '/hospital/profile/',
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    LIST:          '/notifications/',
    UNREAD_COUNT:  '/notifications/unread_count/',                    // FIX #8: was unread-count
    MARK_READ:     (id) => `/notifications/${id}/mark_read/`,         // FIX #8: was /read/
    MARK_ALL_READ: '/notifications/mark_all_read/',                   // FIX #8: was mark-all-read
    DELETE:        (id) => `/notifications/${id}/`,
  },

  // ── Admin ─────────────────────────────────────────────────────────────────────
  ADMIN: {
    STATS:              '/admin/stats/',
    HEALTH:             '/admin/health/',
    HOSPITALS:          '/admin/hospitals/',
    HOSPITAL_DETAIL:    (id) => `/admin/hospitals/${id}/`,         // GET full hospital profile (Gap #3B)
    TOGGLE_HOSPITAL:    (id) => `/admin/hospitals/${id}/toggle/`,
    DOCTORS:            '/admin/doctors/',
    DOCTOR_DETAIL:      (id) => `/admin/doctors/${id}/`,           // GET full doctor profile (Gap #3B)
    TOGGLE_DOCTOR:      (id) => `/admin/doctors/${id}/toggle/`,
    PATIENTS:           '/admin/patients/',
    PATIENT_DETAIL:     (id) => `/admin/patients/${id}/`,          // GET full patient profile (Gap #3B)
    TOGGLE_PATIENT:     (id) => `/admin/patients/${id}/toggle/`,   // FIX ISSUE-006/011: activate/deactivate patient
    ALL_USERS:          '/admin/users/',                            // Fix NEW#1 — all users combined
    USER_DETAIL:        (id) => `/admin/users/${id}/`,             // PATCH/DELETE to toggle/remove user
    APPOINTMENTS:       '/admin/appointments/',
    AUDIT_LOGS:         '/admin/audit-logs/',
    SETTINGS:           '/admin/settings/',                        // Gap #1 — platform settings
    TIME_SERIES:        (days) => `/admin/analytics/time-series/?days=${days}`,  // Gap #2 — real chart data
    ASSISTANTS:         '/admin/assistants/',                      // Fix NEW#2 / Gap#3A — assistants list
    ASSISTANT_DETAIL:   (id) => `/admin/assistants/${id}/`,        // GET full assistant profile (Gap #3B)
    TOGGLE_ASSISTANT:   (id) => `/admin/assistants/${id}/toggle/`, // FIX ISSUE-016: activate/deactivate assistant
  },

  // ── Departments (public) ──────────────────────────────────────────────────────
  DEPARTMENTS: {
    LIST:   '/departments/',                                   // ?hospital=id for filtering
    DETAIL: (id) => `/departments/${id}/`,
  },

  // ── Prescriptions ─────────────────────────────────────────────────────────────
  PRESCRIPTIONS: {
    LIST:   '/prescriptions/',
    DETAIL: (id) => `/prescriptions/${id}/`,
    SEND:   (id) => `/prescriptions/${id}/send/`,   // FIX: was missing, used in doctorApi.js
  },

  // ── Reviews ───────────────────────────────────────────────────────────────────
  REVIEWS: {
    LIST:   '/reviews/',                          // GET — admin only
    // HIGH-01 FIX: CREATE was '/reviews/' which is IsAdminUser → returns 403 for patients.
    // Patient review creation MUST go through /doctors/{id}/reviews/ (DoctorProfileViewSet.reviews).
    // Use DOCTORS.REVIEWS(doctorId) for creating reviews — not this constant.
    CREATE: (doctorId) => `/doctors/${doctorId}/reviews/`,
    DETAIL: (id) => `/reviews/${id}/`,
    UPDATE: (id) => `/reviews/${id}/`,
    DELETE: (id) => `/reviews/${id}/`,
    MY:     '/reviews/my/',
  },

  // ── Search ────────────────────────────────────────────────────────────────────
  // FIX: was missing entirely — searchApi.js uses API.SEARCH.DOCTORS
  // FIX M-02: DOCTORS path must match backend /api/v1/search/doctors/ (not /doctors/search/)
  SEARCH: {
    DOCTORS:   '/search/doctors/',   // ✅ matches backend search app /api/v1/search/doctors/
    HOSPITALS: '/hospitals/search/',
    GLOBAL:    '/search/',
    SLOTS:     '/search/slots/',
  },

  // ── Contact
  CONTACT: {
    SEND: '/contact/',
  },

  // ── Billing ───────────────────────────────────────────────────────────────────
  // FIX ⚠️: BillingPage.jsx and billingApi.js were using hardcoded strings.
  // All billing paths now centralized here — single source of truth.
  BILLING: {
    PLANS:            '/billing/plans/',
    SUBSCRIPTION:     '/billing/subscription/',
    CHECKOUT:         '/billing/checkout/',
    UPGRADE:          '/billing/upgrade/',
    CANCEL:           '/billing/cancel/',
    REACTIVATE:       '/billing/reactivate/',
    PORTAL:           '/billing/portal/',
    PAYMOB_CHECKOUT:  '/billing/paymob/checkout/',
    PAYMOB_WEBHOOK:   '/billing/paymob/webhook/',
    STRIPE_WEBHOOK:   '/billing/webhook/stripe/',
  },

  // ── Video ─────────────────────────────────────────────────────────────────────
  // FIX ⚠️: videoApi.js was using hardcoded strings.
  // All video paths now centralized here.
  VIDEO: {
    SESSIONS:      '/video/sessions/',
    SESSION:       (id) => `/video/sessions/${id}/`,
    SESSION_TOKEN: (id) => `/video/sessions/${id}/token/`,
    SESSION_START: (id) => `/video/sessions/${id}/start/`,
    SESSION_END:   (id) => `/video/sessions/${id}/end/`,
  },

  // ── Locations ─────────────────────────────────────────────────────────────────
  LOCATIONS: {
    CITIES: '/locations/cities/',
  },

  // ── Chat ──────────────────────────────────────────────────────────────────────
  CHAT: {
    CONVERSATIONS:        '/chat/conversations/',
    CONVERSATION_DETAIL:  (id) => `/chat/conversations/${id}/`,
    MESSAGES:             (id) => `/chat/conversations/${id}/messages/`,
    EDIT_MESSAGE:         (conversationId, messageId) => `/chat/conversations/${conversationId}/messages/${messageId}/`,
    MARK_READ:            (id) => `/chat/conversations/${id}/read/`,
  },

  // ── Reports ───────────────────────────────────────────────────────────────────
  // MED-01 FIX: backend/reports/ app endpoint — GET /reports/ for saved reports list
  REPORTS: {
    LIST:   '/reports/',
    DETAIL: (id) => `/reports/${id}/`,
  },
};

export default API;

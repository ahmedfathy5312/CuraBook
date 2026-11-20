// e2e/helpers/test-data.js
// Shared test data and factory helpers for E2E tests

export const TEST_USERS = {
  doctor: {
    email:    process.env.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
    password: process.env.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    name:     'Dr. Test Doctor',
    role:     'doctor',
  },
  patient: {
    email:    process.env.TEST_PATIENT_EMAIL    || 'patient@curabook.test',
    password: process.env.TEST_PATIENT_PASSWORD || 'TestPat@123',
    name:     'Test Patient',
    role:     'patient',
  },
  admin: {
    email:    process.env.TEST_ADMIN_EMAIL    || 'admin@curabook.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin@123',
    role:     'admin',
  },
};

export const TEST_APPOINTMENT = {
  date:       new Date(Date.now() + 2 * 86_400_000).toISOString().split('T')[0], // 2 days from now
  visitType:  'IN_PERSON',
  notes:      'E2E test appointment',
};

export const TEST_PRESCRIPTION = {
  medication: 'Amoxicillin',
  dosage:     '500mg',
  frequency:  'Twice daily',
  duration:   '7 days',
  notes:      'Take with food',
};

export const TEST_MEDICAL_RECORD = {
  chiefComplaint: 'Persistent headache',
  diagnosis:      'Tension headache',
  treatmentPlan:  'Rest, hydration, paracetamol',
  notes:          'Follow up in 1 week if no improvement',
};

// ── Date helpers ───────────────────────────────────────────────────────────

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

export function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString().split('T')[0];
}

// ── URL helpers ────────────────────────────────────────────────────────────

export const ROUTES = {
  home:            '/',
  login:           '/login',
  register:        '/register',
  forgotPassword:  '/forgot-password',

  // Doctor
  doctorDashboard:    '/doctor/dashboard',
  doctorAppointments: '/doctor/appointments',
  doctorPatients:     '/doctor/patients',
  doctorAnalytics:    '/doctor/analytics',
  doctorSchedule:     '/doctor/schedule',
  doctorProfile:      '/doctor/profile',
  doctorSettings:     '/doctor/profile/settings',
  doctorNotifications:'/doctor/notifications',
  doctorPrescriptions:'/doctor/prescriptions',
  doctorReports:      '/doctor/reports',
};

// ── Wait helpers ───────────────────────────────────────────────────────────

/**
 * Wait for a toast/snackbar message matching the given text or regex.
 */
export async function waitForToast(page, textOrRegex, timeout = 5_000) {
  const toast = page.getByRole('alert')
    .or(page.getByTestId('toast'))
    .or(page.locator('[class*="toast"], [class*="snackbar"]'));
  await toast.filter({ hasText: textOrRegex }).waitFor({ timeout });
}

/**
 * Dismiss any open modal by pressing Escape.
 */
export async function dismissModal(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Switch UI language to Arabic.
 * Returns true if switch was found and clicked.
 */
export async function switchToArabic(page) {
  const btn = page.getByRole('button', { name: /arabic|AR|العربية/i });
  if (await btn.count() > 0) {
    await btn.first().click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Switch UI language back to English.
 */
export async function switchToEnglish(page) {
  const btn = page.getByRole('button', { name: /english|EN/i });
  if (await btn.count() > 0) {
    await btn.first().click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Check that there are no raw i18n keys visible on the page.
 * Raw keys look like "namespace.key.subkey"
 */
export async function assertNoRawI18nKeys(page, namespace) {
  const body    = await page.textContent('body');
  const pattern = new RegExp(`${namespace}\\.\\w+\\.\\w+`, 'g');
  const keys    = body?.match(pattern) || [];
  return keys;
}

/**
 * Collect all JavaScript errors from the page.
 * Call this before navigation, then check after.
 */
export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  return errors;
}

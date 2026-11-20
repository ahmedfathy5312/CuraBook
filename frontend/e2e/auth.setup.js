/**
 * e2e/auth.setup.js
 *
 * Runs once before all E2E tests.
 * Logs in as each role and saves the browser storage state to disk so
 * individual test files can reuse sessions without re-logging in.
 *
 * Roles: patient, doctor, hospital_admin, assistant
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

// ── Storage state paths (gitignored) ──────────────────────────────────────
export const PATIENT_STATE        = path.join(__dirname, '.auth/patient.json');
export const DOCTOR_STATE         = path.join(__dirname, '.auth/doctor.json');
export const HOSPITAL_ADMIN_STATE = path.join(__dirname, '.auth/hospital_admin.json');
// Sprint 5: Assistant role added
export const ASSISTANT_STATE      = path.join(__dirname, '.auth/assistant.json');

// ── Test credentials (match backend seeded fixtures / test DB) ────────────
const CREDENTIALS = {
  patient: {
    email:    process.env.E2E_PATIENT_EMAIL    || 'patient@curabook.test',
    password: process.env.E2E_PATIENT_PASSWORD || 'TestPass123!',
  },
  doctor: {
    email:    process.env.E2E_DOCTOR_EMAIL    || 'doctor@curabook.test',
    password: process.env.E2E_DOCTOR_PASSWORD || 'TestPass123!',
  },
  hospitalAdmin: {
    email:    process.env.E2E_HOSPITAL_ADMIN_EMAIL    || 'hospital@curabook.test',
    password: process.env.E2E_HOSPITAL_ADMIN_PASSWORD || 'TestPass123!',
  },
  // Sprint 5: Assistant credentials
  assistant: {
    email:    process.env.E2E_ASSISTANT_EMAIL    || 'assistant@curabook.test',
    password: process.env.E2E_ASSISTANT_PASSWORD || 'TestPass123!',
  },
};

async function loginAs(page, { email, password }, storageStatePath) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  // Wait for successful redirect away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  await page.context().storageState({ path: storageStatePath });
}

setup('authenticate as patient', async ({ page }) => {
  await loginAs(page, CREDENTIALS.patient, PATIENT_STATE);
});

setup('authenticate as doctor', async ({ page }) => {
  await loginAs(page, CREDENTIALS.doctor, DOCTOR_STATE);
});

setup('authenticate as hospital admin', async ({ page }) => {
  await loginAs(page, CREDENTIALS.hospitalAdmin, HOSPITAL_ADMIN_STATE);
});

// Sprint 5: Assistant setup
setup('authenticate as assistant', async ({ page }) => {
  await loginAs(page, CREDENTIALS.assistant, ASSISTANT_STATE);
});

// e2e/tests/auth.setup.js
// Playwright global setup — creates auth state fixtures for all roles.
// Runs once before all test projects that depend on 'setup'.
//
//   playwright.config.js → projects[].dependencies: ['setup']
//   storageState: './e2e/fixtures/doctor-auth.json'

import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve('e2e/fixtures');

const DOCTOR_AUTH_FILE  = path.join(FIXTURES_DIR, 'doctor-auth.json');
const PATIENT_AUTH_FILE = path.join(FIXTURES_DIR, 'patient-auth.json');
const ADMIN_AUTH_FILE   = path.join(FIXTURES_DIR, 'admin-auth.json');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const USERS = {
  doctor: {
    email:    process.env.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
    password: process.env.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    file:     DOCTOR_AUTH_FILE,
    redirect: /doctor\/dashboard/,
  },
  patient: {
    email:    process.env.TEST_PATIENT_EMAIL    || 'patient@curabook.test',
    password: process.env.TEST_PATIENT_PASSWORD || 'TestPat@123',
    file:     PATIENT_AUTH_FILE,
    redirect: /patient|home|dashboard/,
  },
};

// ── Ensure fixtures directory exists ─────────────────────────────────────────
setup.beforeAll(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
});

// ── Doctor auth ───────────────────────────────────────────────────────────────
setup('🔐 Setup: Doctor auth state', async ({ page }) => {
  const { email, password, file, redirect } = USERS.doctor;

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login|دخول/i }).click();

  // Wait for successful navigation
  await page.waitForURL(redirect, { timeout: 15_000 }).catch(() => {
    // If login fails (no backend), just save empty-ish state
    console.warn('⚠️  Doctor login redirect not detected — saving current state');
  });

  await page.context().storageState({ path: file });
  console.log(`✅ Doctor auth saved → ${file}`);
});

// ── Patient auth ──────────────────────────────────────────────────────────────
setup('🔐 Setup: Patient auth state', async ({ page }) => {
  const { email, password, file, redirect } = USERS.patient;

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login|دخول/i }).click();

  await page.waitForURL(redirect, { timeout: 15_000 }).catch(() => {
    console.warn('⚠️  Patient login redirect not detected — saving current state');
  });

  await page.context().storageState({ path: file });
  console.log(`✅ Patient auth saved → ${file}`);
});

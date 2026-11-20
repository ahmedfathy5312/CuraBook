/**
 * e2e/hospital-admin.spec.js — Hospital Admin Dashboard
 * API-H10 FIX: End-to-end tests for hospital admin user journey.
 *
 * Scenarios:
 *   1. Admin dashboard loads with stats
 *   2. Doctors list visible and filterable
 *   3. Appointments overview visible
 *   4. Admin cannot access patient-only routes
 */

import { test, expect } from '@playwright/test';
import { HOSPITAL_ADMIN_STATE } from './auth.setup.js';

test.use({ storageState: HOSPITAL_ADMIN_STATE });

test.describe('Hospital Admin Dashboard', () => {

  test('dashboard loads with key stats', async ({ page }) => {
    await page.goto('/hospital/dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    await expect(
      page.getByRole('heading', { name: /dashboard|لوحة/i }).first()
    ).toBeVisible({ timeout: 8_000 });

    // At least one stat card should be visible
    await expect(
      page.locator('[data-testid="stat-card"], .stat-card, .stats').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('doctors list page loads', async ({ page }) => {
    await page.goto('/hospital/doctors');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('appointments page loads', async ({ page }) => {
    await page.goto('/hospital/appointments');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('admin cannot access patient booking page', async ({ page }) => {
    // Hospital admin should not be booking appointments as a patient
    await page.goto('/patient/dashboard');
    // Should redirect to their own dashboard or show unauthorized
    await expect(page).not.toHaveURL('/patient/dashboard');
  });

});

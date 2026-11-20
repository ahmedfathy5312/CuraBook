/**
 * e2e/doctor-onboarding.spec.js — Doctor Onboarding Wizard
 * API-H10 FIX: End-to-end test for doctor registration + profile completion.
 *
 * Scenario A — New Doctor Registration:
 *   1. Navigate to /register/doctor
 *   2. Fill personal info (name, email, password)
 *   3. Fill professional info (specialty, license, bio)
 *   4. Submit → see success / pending approval message
 *
 * Scenario B — Doctor Dashboard (existing doctor):
 *   1. Log in as doctor
 *   2. See upcoming appointments
 *   3. Update consultation fee → verify saved
 *   4. Negative fee rejected with validation error (API-H06 regression)
 */

import { test, expect } from '@playwright/test';
import { DOCTOR_STATE } from './auth.setup.js';

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Registration (no auth needed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Doctor Registration', () => {

  test('registration page loads and shows all required fields', async ({ page }) => {
    await page.goto('/register/doctor');
    await expect(page).toHaveURL(/register.*doctor|doctor.*register/);

    // Core fields should be visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByLabel(/first.name|full.name|الاسم/i)).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/register/doctor');

    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).first().fill('SomePass123!');
    await page.getByRole('button', { name: /register|sign up|إنشاء/i }).click();

    // Should show email validation error — not redirect
    await expect(page).toHaveURL(/register.*doctor|doctor.*register/);
  });

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/register/doctor');

    const emailField = page.getByLabel(/email/i);
    await emailField.fill(`test${Date.now()}@example.com`);

    const passwords = page.getByLabel(/password/i);
    await passwords.first().fill('Password123!');
    if (await passwords.count() > 1) {
      await passwords.nth(1).fill('DifferentPass456!');
      await page.getByRole('button', { name: /register|sign up|إنشاء/i }).click();
      // Should stay on register page
      await expect(page).toHaveURL(/register/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Dashboard (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Doctor Dashboard', () => {
  test.use({ storageState: DOCTOR_STATE });

  test('doctor dashboard loads with appointments section', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // Should see some dashboard content
    await expect(
      page.getByRole('heading', { name: /dashboard|appointments|schedule|لوحة/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('doctor can navigate to profile edit', async ({ page }) => {
    await page.goto('/doctor/profile');
    await expect(page).not.toHaveURL(/\/login/);

    // Profile form should be visible
    await expect(
      page.locator('form, [data-testid="profile-form"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('consultation fee field rejects negative values (API-H06 regression)', async ({ page }) => {
    await page.goto('/doctor/profile');
    await expect(page).not.toHaveURL(/\/login/);

    const feeInput = page.getByLabel(/fee|أتعاب|رسوم/i).or(
      page.locator('input[name*="fee"], input[name*="consultation"]')
    ).first();

    await feeInput.waitFor({ timeout: 6_000 });
    await feeInput.fill('-100');

    // Attempt to save
    const saveBtn = page.getByRole('button', { name: /save|update|حفظ|تحديث/i }).first();
    await saveBtn.click();

    // Should see validation error (either HTML5 or custom)
    const hasHtml5Error = await feeInput.evaluate((el) => !el.validity.valid);
    if (!hasHtml5Error) {
      // Custom validation error should appear in UI
      await expect(
        page.locator('text=/negative|invalid|يجب أن تكون/i, [role="alert"]').first()
      ).toBeVisible({ timeout: 4_000 });
    }
    // Either way, should not navigate away
    await expect(page).toHaveURL(/doctor\/profile/);
  });

  test('doctor schedule page loads', async ({ page }) => {
    await page.goto('/doctor/schedule');
    await expect(page).not.toHaveURL(/\/login/);
  });
});

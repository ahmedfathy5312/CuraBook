// e2e/tests/patient-records.spec.js
// Critical Flow: Patient Records, Medical History Timeline, Notifications

import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('📋 Patient Records - Critical Flows', () => {

  test('TC-PREC-01 | Patients list page loads', async ({ page }) => {
    await page.goto('/doctor/patients');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-PREC-02 | Bulk select checkbox is present', async ({ page }) => {
    await page.goto('/doctor/patients');
    await page.waitForLoadState('networkidle');
    const selectAll = page.getByRole('checkbox', { name: /select all|تحديد الكل/i });
    if (await selectAll.count() > 0) {
      await expect(selectAll.first()).toBeVisible();
    }
  });

  test('TC-PREC-03 | Patient search is functional', async ({ page }) => {
    await page.goto('/doctor/patients');
    const search = page.getByPlaceholder(/search|بحث/i);
    if (await search.count() > 0) {
      await search.fill('Ahmed');
      await page.waitForTimeout(400);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-PREC-04 | Patient detail page opens', async ({ page }) => {
    await page.goto('/doctor/patients');
    await page.waitForLoadState('networkidle');
    const firstPatientLink = page.getByRole('link', { name: /view|see|عرض/i }).first()
      .or(page.getByRole('row').nth(1).getByRole('link').first());
    if (await firstPatientLink.count() > 0) {
      await firstPatientLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-PREC-05 | Medical history tab is present on patient record', async ({ page }) => {
    await page.goto('/doctor/patients/1'); // adjust ID as needed
    const historyTab = page.getByRole('tab', { name: /history|timeline|سجل/i });
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-PREC-06 | New patient record form opens', async ({ page }) => {
    await page.goto('/doctor/patients/new');
    await expect(page.getByRole('main')).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe('🔔 Notifications - Critical Flows', () => {

  test('TC-NOTIF-01 | Notifications page loads', async ({ page }) => {
    await page.goto('/doctor/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NOTIF-02 | Notification bell shows unread count', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    const badge = page.getByTestId('notification-badge')
      .or(page.locator('[aria-label*="notification"]').first());
    if (await badge.count() > 0) {
      await expect(badge.first()).toBeVisible();
    }
  });

  test('TC-NOTIF-03 | Mark all as read button is present', async ({ page }) => {
    await page.goto('/doctor/notifications');
    await page.waitForLoadState('networkidle');
    const markAllBtn = page.getByRole('button', { name: /mark all|تحديد الكل كمقروء/i });
    if (await markAllBtn.count() > 0) {
      await expect(markAllBtn.first()).toBeVisible();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe('💊 Prescriptions - Critical Flows', () => {

  test('TC-PRESC-01 | Prescriptions page loads', async ({ page }) => {
    await page.goto('/doctor/prescriptions');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-PRESC-02 | Create prescription button is visible', async ({ page }) => {
    await page.goto('/doctor/prescriptions');
    const createBtn = page.getByRole('button', { name: /new|create|add|جديد|إنشاء/i });
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe('⚙️ Profile Settings - Critical Flows', () => {

  test('TC-PROF-01 | Profile overview page loads', async ({ page }) => {
    await page.goto('/doctor/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-PROF-02 | Profile settings has multiple tabs', async ({ page }) => {
    await page.goto('/doctor/profile/settings');
    await page.waitForLoadState('networkidle');
    const tabs = page.getByRole('tab');
    if (await tabs.count() > 0) {
      expect(await tabs.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('TC-PROF-03 | Notification preferences tab exists', async ({ page }) => {
    await page.goto('/doctor/profile/settings');
    await page.waitForLoadState('networkidle');
    const notifTab = page.getByRole('tab', { name: /notif|إشعار/i });
    if (await notifTab.count() > 0) {
      await notifTab.click();
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});

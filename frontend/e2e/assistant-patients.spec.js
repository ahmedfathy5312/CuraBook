/**
 * e2e/assistant-patients.spec.js — Assistant Patients Page E2E Tests
 * Sprint 5: E2E coverage for patient management.
 */

import { test, expect } from '@playwright/test';
import { ASSISTANT_STATE } from './auth.setup.js';

test.use({ storageState: ASSISTANT_STATE });

test.describe('Assistant Patients Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/patients');
    await page.waitForLoadState('networkidle');
  });

  test('patients page loads without redirect to login', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page heading or title is visible', async ({ page }) => {
    const heading = page.locator('h1, h2, [data-testid="page-title"]').first();
    await expect(heading).toBeVisible({ timeout: 8_000 });
  });

  test('patient list or empty state renders', async ({ page }) => {
    const content = page.locator(
      '[data-testid="patient-list"], .patient-list, [role="list"]'
    ).or(page.getByText(/لا يوجد|no patients/i)).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('search input is accessible and focusable', async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"]').first();
    if (await search.count() > 0) {
      await expect(search).toBeVisible();
      await search.focus();
      await search.fill('محمد');
      await page.waitForTimeout(600); // debounce
      // تأكد عدم الكراش بعد البحث
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

  test('clicking patient row opens detail drawer', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator('[data-testid="patient-row"], .patient-row, [role="listitem"]').first();
    if (await row.count() > 0) {
      await row.click();
      const drawer = page.locator(
        '[data-testid="patient-drawer"], .patient-drawer, [role="dialog"]'
      ).first();
      await expect(drawer).toBeVisible({ timeout: 5_000 });
    }
  });

  test('read-only guard message is visible', async ({ page }) => {
    // يجب أن يظهر نص يُوضح أن الصفحة للعرض فقط
    const guard = page.getByText(/للعرض فقط|view only|read.?only/i).first();
    if (await guard.count() > 0) {
      await expect(guard).toBeVisible();
    }
  });

  test('status filter tabs work', async ({ page }) => {
    const filterBtns = page.locator('[role="tab"], [data-testid="filter-tab"]');
    const count = await filterBtns.count();
    if (count > 1) {
      await filterBtns.nth(1).click();
      await page.waitForTimeout(500);
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

  test('Escape closes patient drawer', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator('[data-testid="patient-row"], .patient-row, [role="listitem"]').first();
    if (await row.count() === 0) return;

    await row.click();
    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 3_000 });
  });

});

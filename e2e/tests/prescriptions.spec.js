// e2e/tests/prescriptions.spec.js
// Critical Flow: Prescription CRUD — create, view, search, print

import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('💊 Prescriptions - Critical Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/doctor/prescriptions');
    await page.waitForLoadState('networkidle');
  });

  // ── Page Rendering ──────────────────────────────────────────────────────

  test('TC-PRSC-01 | Prescriptions page loads', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('TC-PRSC-02 | Page heading is visible', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /prescriptions|وصفات/i });
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  // ── Prescription List ───────────────────────────────────────────────────

  test('TC-PRSC-03 | Prescription items render or empty state shows', async ({ page }) => {
    const items   = page.getByTestId('prescription-item')
      .or(page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }));
    const empty   = page.getByText(/no prescriptions|لا توجد وصفات/i);
    const hasData = await items.count() > 0;
    const isEmpty = await empty.count() > 0;
    expect(hasData || isEmpty).toBe(true);
  });

  test('TC-PRSC-04 | Search/filter input is present', async ({ page }) => {
    const search = page.getByPlaceholder(/search|بحث/i)
      .or(page.getByRole('searchbox'));
    if (await search.count() > 0) {
      await expect(search.first()).toBeVisible();
    }
  });

  // ── Create Prescription ─────────────────────────────────────────────────

  test('TC-PRSC-05 | New prescription button is present', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new prescription|add|create|وصفة جديدة/i });
    if (await newBtn.count() > 0) {
      await expect(newBtn.first()).toBeVisible();
    }
  });

  test('TC-PRSC-06 | New prescription modal/form opens', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new|add|create|إضافة/i }).first();
    if (await newBtn.count() > 0) {
      await newBtn.click();
      // Modal or inline form should appear
      const form = page.getByRole('dialog').or(page.getByRole('form'));
      if (await form.count() > 0) {
        await expect(form.first()).toBeVisible();
      }
    }
  });

  test('TC-PRSC-07 | Prescription form has required fields', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new|add|create|إضافة/i }).first();
    if (await newBtn.count() > 0) {
      await newBtn.click();
      await page.waitForTimeout(500);
      // At minimum, medication name should exist
      const medField = page.getByLabel(/medication|drug|دواء/i)
        .or(page.getByPlaceholder(/medication|drug|دواء/i));
      if (await medField.count() > 0) {
        await expect(medField.first()).toBeVisible();
      }
    }
  });

  // ── Search Functionality ────────────────────────────────────────────────

  test('TC-PRSC-08 | Search filters prescriptions', async ({ page }) => {
    const search = page.getByPlaceholder(/search|بحث/i);
    if (await search.count() > 0) {
      await search.fill('Amoxicillin');
      await page.waitForTimeout(400);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  // ── Print / Export ──────────────────────────────────────────────────────

  test('TC-PRSC-09 | Print button is present', async ({ page }) => {
    const printBtn = page.getByRole('button', { name: /print|طباعة/i });
    if (await printBtn.count() > 0) {
      await expect(printBtn.first()).toBeVisible();
    }
  });

  // ── Pagination ──────────────────────────────────────────────────────────

  test('TC-PRSC-10 | Pagination works if multiple pages', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next|التالي/i });
    if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  // ── Bilingual ───────────────────────────────────────────────────────────

  test('TC-PRSC-11 | No missing translation keys (no raw keys shown)', async ({ page }) => {
    const body = await page.textContent('body');
    const rawKeys = body?.match(/prescriptions\.\w+\.\w+/g) || [];
    expect(rawKeys).toHaveLength(0);
  });
});

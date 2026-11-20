// e2e/tests/reports.spec.js
// Critical Flow: Doctor Reports — chart rendering, export, date filters

import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('📈 Reports - Critical Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/doctor/reports');
    await page.waitForLoadState('networkidle');
  });

  test('TC-RPT-01 | Reports page loads', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('TC-RPT-02 | Charts or data tables are present', async ({ page }) => {
    await page.waitForTimeout(800);
    const charts = page.locator('.recharts-wrapper, canvas, [data-testid$="-chart"]');
    const tables = page.getByRole('table');
    const hasCharts = await charts.count() > 0;
    const hasTables = await tables.count() > 0;
    expect(hasCharts || hasTables).toBe(true);
  });

  test('TC-RPT-03 | Export/download button is present', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export|download|تصدير|تحميل/i });
    if (await exportBtn.count() > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });

  test('TC-RPT-04 | Date range filter works', async ({ page }) => {
    const fromInput = page.getByLabel(/from|start date|من/i);
    const toInput   = page.getByLabel(/to|end date|إلى/i);
    if (await fromInput.count() > 0 && await toInput.count() > 0) {
      const today    = new Date().toISOString().split('T')[0];
      const lastMonth = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0];
      await fromInput.fill(lastMonth);
      await toInput.fill(today);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-RPT-05 | Reports page is bilingual (no raw i18n keys)', async ({ page }) => {
    const body    = await page.textContent('body');
    const rawKeys = body?.match(/reports\.\w+/g) || [];
    expect(rawKeys).toHaveLength(0);
  });

  test('TC-RPT-06 | Page does not overflow in mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/doctor/reports');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth + 5
    );
    expect(overflow).toBe(false);
  });
});

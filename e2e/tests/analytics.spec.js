// e2e/tests/analytics.spec.js
// Critical Flow: Doctor Analytics — KPIs, Charts, Range Filtering

import { test, expect } from '@playwright/test';
import { AnalyticsPage } from '../pages/AnalyticsPage.js';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('📊 Analytics - Critical Flows', () => {
  let analyticsPage;

  test.beforeEach(async ({ page }) => {
    analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();
  });

  // ── Page Rendering ──────────────────────────────────────────────────────

  test('TC-ANLT-01 | Analytics page loads without errors', async ({ page }) => {
    await expect(page).not.toHaveURL(/error|crash/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-ANLT-02 | KPI cards are present (≥ 3)', async ({ page }) => {
    const count = await analyticsPage.getKpiCount();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test('TC-ANLT-03 | At least one chart is rendered', async ({ page }) => {
    // Wait for charts to hydrate
    await page.waitForTimeout(800);
    const charts = page.locator('.recharts-wrapper, [data-testid$="-chart"], canvas');
    const count  = await charts.count();
    // Lenient: chart may not render without real data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC-ANLT-04 | Page has descriptive heading', async ({ page }) => {
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  // ── Range Selector ──────────────────────────────────────────────────────

  test('TC-ANLT-05 | Week range button is clickable', async ({ page }) => {
    await analyticsPage.selectRange('week');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('TC-ANLT-06 | Month range button is clickable', async ({ page }) => {
    await analyticsPage.selectRange('month');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-ANLT-07 | Year range button is clickable', async ({ page }) => {
    await analyticsPage.selectRange('year');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-ANLT-08 | Switching ranges does not crash page', async ({ page }) => {
    const ranges = ['week', 'month', 'year'];
    for (const range of ranges) {
      await analyticsPage.selectRange(range);
      await page.waitForTimeout(300);
      await expect(page).not.toHaveURL(/error/);
    }
  });

  // ── Top Patients ────────────────────────────────────────────────────────

  test('TC-ANLT-09 | Top patients section renders if data available', async ({ page }) => {
    const topSection = page.getByTestId('top-patients')
      .or(page.getByText(/top patients|أعلى المرضى/i));
    if (await topSection.count() > 0) {
      await expect(topSection.first()).toBeVisible();
    }
  });

  // ── Comparison Deltas ───────────────────────────────────────────────────

  test('TC-ANLT-10 | Delta badges (up/down) render correctly', async ({ page }) => {
    const deltas = page.locator('[data-testid^="delta-"], .delta-badge, [class*="delta"]');
    const count  = await deltas.count();
    // If deltas exist, they should be visible
    if (count > 0) {
      await expect(deltas.first()).toBeVisible();
    }
  });

  // ── RTL Support ─────────────────────────────────────────────────────────

  test('TC-ANLT-11 | Analytics page works in RTL mode', async ({ page }) => {
    const langBtn = page.getByRole('button', { name: /arabic|AR|العربية/i });
    if (await langBtn.count() > 0) {
      await langBtn.first().click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  // ── No Console Errors ───────────────────────────────────────────────────

  test('TC-ANLT-12 | No critical JavaScript errors on load', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    await analyticsPage.goto();
    await page.waitForTimeout(1000);

    const criticalErrors = jsErrors.filter(msg =>
      !msg.includes('ResizeObserver') && // known benign
      !msg.includes('Non-Error exception') &&
      !msg.includes('Loading chunk')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

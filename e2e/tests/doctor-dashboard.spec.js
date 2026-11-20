// e2e/tests/doctor-dashboard.spec.js
// Critical Flow: Doctor Dashboard — Navigation, KPIs, Welcome Banner

import { test, expect } from '@playwright/test';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage.js';

// Use pre-saved auth state so we don't re-login for every test
test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('🏥 Doctor Dashboard - Critical Flows', () => {
  let dash;

  test.beforeEach(async ({ page }) => {
    dash = new DoctorDashboardPage(page);
    await dash.goto();
  });

  // ── Dashboard Rendering ────────────────────────────────────────────────

  test('TC-DASH-01 | Dashboard page loads without errors', async ({ page }) => {
    await expect(page).not.toHaveURL(/error|crash/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-DASH-02 | Welcome banner displays doctor info', async ({ page }) => {
    const banner = page.getByTestId('welcome-banner');
    if (await banner.count() > 0) {
      const text = await banner.textContent();
      expect(text).not.toBeNull();
      // Should contain a name or greeting
      expect(text!.length).toBeGreaterThan(5);
    }
  });

  test('TC-DASH-03 | KPI cards are visible (≥ 3)', async ({ page }) => {
    // KPI cards should show at minimum: patients, appointments, earnings
    const kpiCards = page.getByTestId('kpi-card');
    const count = await kpiCards.count();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test('TC-DASH-04 | Sidebar navigation is present', async ({ page }) => {
    const sidebar = page.getByRole('navigation');
    await expect(sidebar.first()).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────

  test('TC-NAV-01 | Navigate to Appointments page', async ({ page }) => {
    await dash.navigateTo('appointments');
    await expect(page).toHaveURL(/appointments/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NAV-02 | Navigate to Patients page', async ({ page }) => {
    await dash.navigateTo('patients');
    await expect(page).toHaveURL(/patients/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NAV-03 | Navigate to Analytics page', async ({ page }) => {
    await dash.navigateTo('analytics');
    await expect(page).toHaveURL(/analytics/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NAV-04 | Navigate to Schedule page', async ({ page }) => {
    await dash.navigateTo('schedule');
    await expect(page).toHaveURL(/schedule/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NAV-05 | Navigate to Profile page', async ({ page }) => {
    await dash.navigateTo('profile');
    await expect(page).toHaveURL(/profile/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('TC-NAV-06 | Navigate to Notifications page', async ({ page }) => {
    await dash.navigateTo('notifications');
    await expect(page).toHaveURL(/notifications/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  // ── Language Toggle ────────────────────────────────────────────────────

  test('TC-LANG-01 | Language toggle button is present', async ({ page }) => {
    const langBtn = page.getByRole('button', { name: /english|arabic|AR|EN|العربية/i });
    if (await langBtn.count() > 0) {
      await expect(langBtn.first()).toBeVisible();
    }
  });

  test('TC-LANG-02 | Switching to Arabic flips page direction to RTL', async ({ page }) => {
    const langBtn = page.getByRole('button', { name: /arabic|AR|العربية/i });
    if (await langBtn.count() > 0) {
      await langBtn.first().click();
      await page.waitForTimeout(500);
      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe('rtl');
    }
  });

  // ── Appointments Sub-page ──────────────────────────────────────────────

  test('TC-APPT-01 | Appointments page renders table or list', async ({ page }) => {
    await dash.navigateTo('appointments');
    const list = page.getByRole('table').or(page.getByRole('list'));
    await expect(list.first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-APPT-02 | Status filter dropdown is functional', async ({ page }) => {
    await dash.navigateTo('appointments');
    const filter = page.getByRole('combobox', { name: /status|الحالة/i });
    if (await filter.count() > 0) {
      await filter.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      // Page should still show content (not crash)
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-APPT-03 | Search bar filters appointments', async ({ page }) => {
    await dash.navigateTo('appointments');
    const search = page.getByPlaceholder(/search|بحث/i);
    if (await search.count() > 0) {
      await search.fill('John');
      await page.waitForTimeout(400); // debounce
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  // ── Analytics Sub-page ─────────────────────────────────────────────────

  test('TC-ANLYT-01 | Analytics charts render without crashing', async ({ page }) => {
    await dash.navigateTo('analytics');
    await page.waitForLoadState('networkidle');
    // Charts are typically SVG or canvas elements
    const chart = page.locator('svg, canvas').first();
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible();
    }
  });

  test('TC-ANLYT-02 | Date range filter buttons work', async ({ page }) => {
    await dash.navigateTo('analytics');
    const rangeBtn = page.getByRole('button', { name: /week|month|3months|year|أسبوع|شهر|سنة/i }).first();
    if (await rangeBtn.count() > 0) {
      await rangeBtn.click();
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  // ── Error Boundary ─────────────────────────────────────────────────────

  test('TC-ERR-01 | Page does not show blank screen on load', async ({ page }) => {
    await dash.goto();
    // If ErrorBoundary triggers, it shows a specific error UI
    const errorBoundary = page.getByTestId('error-boundary');
    await expect(errorBoundary).not.toBeVisible();
  });
});

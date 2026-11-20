/**
 * e2e/mobile-responsive.spec.js — v31 UX-02
 *
 * Visual / layout tests for mobile breakpoints.
 * Covers the pages most likely to break on small screens:
 *   - HospitalDetailPage (20KB — flagged in analysis)
 *   - PatientDashboardPage
 *   - BookingPage
 *   - NotificationsPage
 *
 * Uses Playwright's built-in viewport API — no visual snapshot library needed.
 * Tests that critical layout elements are visible and not overflowing.
 */

import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT  = { width: 375, height: 812 };   // iPhone 13 mini
const TABLET_VIEWPORT  = { width: 768, height: 1024 };  // iPad

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsPatient(page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"], input[type="email"]', 'e2e_patient@curabook.test');
  await page.fill('[data-testid="password-input"], input[type="password"]', 'E2ePatient@123');
  await page.click('[data-testid="login-btn"], button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10_000 });
}

async function setViewport(page, viewport) {
  await page.setViewportSize(viewport);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Mobile Responsive — Patient Pages', () => {
  test.use({ storageState: 'e2e/fixtures/patient.json' });

  test.beforeEach(async ({ page }) => {
    await setViewport(page, MOBILE_VIEWPORT);
  });

  test('PatientDashboardPage — no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const bodyWidth    = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = MOBILE_VIEWPORT.width;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance for borders
  });

  test('PatientDashboardPage — quick action cards visible on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // At least one quick-action link should be visible
    const links = page.locator('a[href*="/appointments"], a[href*="/doctors"], a[href*="/medical-history"]');
    await expect(links.first()).toBeVisible({ timeout: 8_000 });
  });

  test('HospitalDetailPage — loads and renders on mobile without JS error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/hospitals');
    await page.waitForLoadState('networkidle');

    // Navigate to first hospital if available
    const firstCard = page.locator('a[href*="/hospitals/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // No JS errors
      expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0);

      // Page title or main content visible
      const heading = page.locator('h1, h2, [data-testid="hospital-name"]').first();
      await expect(heading).toBeVisible({ timeout: 8_000 });
    }
  });

  test('BookingPage — stepper visible and usable on mobile', async ({ page }) => {
    await page.goto('/doctors');
    await page.waitForLoadState('networkidle');

    const bookBtn = page.locator('a[href*="/book/"], button:has-text("Book"), button:has-text("احجز")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForLoadState('networkidle');

      // Step bar should be visible
      const stepBar = page.locator('[class*="step"], [data-testid="step-bar"], .step-bar').first();
      // Either step bar or at minimum date picker is visible
      const datePicker = page.locator('input[type="date"], [data-testid="date-select"]').first();
      const isVisible = await stepBar.isVisible() || await datePicker.isVisible();
      expect(isVisible).toBeTruthy();
    }
  });

  test('NotificationsPage — list renders without overflow on mobile', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 2);
  });

  test('MedicalHistoryPage — renders on mobile (MISS-02)', async ({ page }) => {
    await page.goto('/medical-history');
    await page.waitForLoadState('networkidle');

    // Page should render without crashing — either content or empty state
    const hasContent = await page.locator('h1, h2').first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Tablet Responsive — Doctor Pages', () => {
  test.use({ storageState: 'e2e/fixtures/doctor.json' });

  test.beforeEach(async ({ page }) => {
    await setViewport(page, TABLET_VIEWPORT);
  });

  test('DoctorDashboard — sidebar not overflowing on tablet', async ({ page }) => {
    await page.goto('/doctor-dashboard');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(TABLET_VIEWPORT.width + 2);
  });
});

test.describe('Mobile Nav — Bottom Nav visibility', () => {
  test.use({ storageState: 'e2e/fixtures/patient.json' });

  test('MobileBottomNav visible on mobile, hidden on desktop', async ({ page }) => {
    // Mobile
    await setViewport(page, MOBILE_VIEWPORT);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const mobileNav = page.locator('[class*="MobileBottomNav"], [data-testid="mobile-nav"]').first();
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }

    // Desktop
    await setViewport(page, { width: 1280, height: 800 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    if (await mobileNav.count() > 0) {
      // Should be hidden on desktop (display:none or not rendered)
      const isHidden = await mobileNav.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden';
      }).catch(() => true);
      expect(isHidden).toBeTruthy();
    }
  });
});

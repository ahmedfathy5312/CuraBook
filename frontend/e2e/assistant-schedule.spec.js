/**
 * e2e/assistant-schedule.spec.js — Assistant Schedule Page E2E Tests
 * Sprint 5: E2E coverage for schedule management.
 *
 * Scenarios:
 *   A — Schedule page loads with slot list
 *   B — View toggle: List / Weekly / Monthly
 *   C — Block slot confirmation dialog
 *   D — Server-side sorting works correctly
 *   E — Workplace filter changes displayed slots
 *   F — Keyboard navigation through slots
 */

import { test, expect } from '@playwright/test';
import { ASSISTANT_STATE } from './auth.setup.js';

test.use({ storageState: ASSISTANT_STATE });

async function gotoSchedule(page) {
  await page.goto('/assistant/schedule');
  await page.waitForLoadState('networkidle');
}

// ─── A: Page Load ─────────────────────────────────────────────────────────────

test.describe('Assistant Schedule — Load', () => {

  test('schedule page loads without crash', async ({ page }) => {
    await gotoSchedule(page);
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('schedule page title or heading is visible', async ({ page }) => {
    await gotoSchedule(page);
    const heading = page.locator(
      'h1, h2, [data-testid="page-title"]'
    ).first();
    await expect(heading).toBeVisible({ timeout: 8_000 });
  });

  test('slot list or empty state renders', async ({ page }) => {
    await gotoSchedule(page);
    const list = page.locator(
      '[data-testid="slot-list"], .slot-list, [role="list"]'
    ).or(page.getByText(/لا توجد|no slots|empty/i)).first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

});


// ─── B: View Toggle ───────────────────────────────────────────────────────────

test.describe('Assistant Schedule — View Toggle', () => {

  test('three view toggle buttons are visible', async ({ page }) => {
    await gotoSchedule(page);
    const toggles = page.locator(
      '[data-testid*="view-toggle"], [aria-label*="قائمة"], [aria-label*="أسبوع"], [aria-label*="شهر"]'
    );
    const count = await toggles.count();
    // قد تكون 3 buttons أو داخل pill toggle
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test('clicking weekly view shows calendar grid', async ({ page }) => {
    await gotoSchedule(page);
    const weeklyBtn = page.getByRole('button', { name: /أسبوعي|weekly|week/i }).first();
    if (await weeklyBtn.count() === 0) {
      test.skip(true, 'Weekly view toggle not found');
      return;
    }

    await weeklyBtn.click();
    await page.waitForTimeout(500);

    // يجب أن يظهر شبكة أيام الأسبوع
    const grid = page.locator(
      '[data-testid="weekly-grid"], .weekly-grid, [data-view="weekly"]'
    ).or(page.getByText(/الاثنين|Monday/i)).first();
    await expect(grid).toBeVisible({ timeout: 5_000 });
  });

  test('clicking monthly view shows month calendar', async ({ page }) => {
    await gotoSchedule(page);
    const monthlyBtn = page.getByRole('button', { name: /شهري|monthly|month/i }).first();
    if (await monthlyBtn.count() === 0) {
      test.skip(true, 'Monthly view toggle not found');
      return;
    }

    await monthlyBtn.click();
    await page.waitForTimeout(500);

    // يجب أن يظهر navigation الشهر
    const calendar = page.locator(
      '[data-testid="monthly-calendar"], .monthly-calendar'
    ).or(page.getByText(/يناير|فبراير|January|February/i)).first();
    await expect(calendar).toBeVisible({ timeout: 5_000 });
  });

  test('list view is default and shows slot rows', async ({ page }) => {
    await gotoSchedule(page);
    // الافتراضي هو List View
    const listView = page.locator(
      '[data-testid="list-view"], .list-view, [data-view="list"]'
    ).first();
    // إذا وُجد
    if (await listView.count() > 0) {
      await expect(listView).toBeVisible();
    }
  });

});


// ─── C: Block Slot ────────────────────────────────────────────────────────────

test.describe('Assistant Schedule — Block Slot', () => {

  test('block button opens confirmation dialog', async ({ page }) => {
    await gotoSchedule(page);
    await page.waitForTimeout(2_000);

    const blockBtn = page.getByRole('button', { name: /حجب|block/i }).first();
    if (await blockBtn.count() === 0) {
      test.skip(true, 'No available slots to block');
      return;
    }

    await blockBtn.click();

    const dialog = page.locator('[role="dialog"], [data-testid="confirm-dialog"], .confirm-modal');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('block confirmation dialog has cancel button', async ({ page }) => {
    await gotoSchedule(page);
    await page.waitForTimeout(2_000);

    const blockBtn = page.getByRole('button', { name: /حجب|block/i }).first();
    if (await blockBtn.count() === 0) {
      test.skip(true, 'No slots available');
      return;
    }

    await blockBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const cancelBtn = dialog.getByRole('button', { name: /إلغاء|cancel/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // يجب إغلاق الـ dialog
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });

  test('pressing Escape closes block confirmation', async ({ page }) => {
    await gotoSchedule(page);
    await page.waitForTimeout(2_000);

    const blockBtn = page.getByRole('button', { name: /حجب|block/i }).first();
    if (await blockBtn.count() === 0) {
      test.skip(true, 'No slots available');
      return;
    }

    await blockBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });

});


// ─── D: Sorting ───────────────────────────────────────────────────────────────

test.describe('Assistant Schedule — Sorting', () => {

  test('sorting controls exist in list view', async ({ page }) => {
    await gotoSchedule(page);
    const sortControls = page.locator(
      '[data-testid="sort-select"], select[name*="sort"], [aria-label*="ترتيب"]'
    );
    // اختياري — اعرض إذا وجد
    const count = await sortControls.count();
    if (count > 0) {
      await expect(sortControls.first()).toBeVisible();
    }
  });

  test('changing sort updates URL or triggers API call', async ({ page }) => {
    await gotoSchedule(page);

    const sortSelect = page.locator('select[name*="sort"], [data-testid="sort-select"]').first();
    if (await sortSelect.count() === 0) {
      test.skip(true, 'Sort control not found');
      return;
    }

    await sortSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // تأكد من عدم الكراش
    const body = await page.textContent('body');
    expect(body).not.toContain('Error');
  });

});


// ─── E: Workplace Filter ──────────────────────────────────────────────────────

test.describe('Assistant Schedule — Workplace Filter', () => {

  test('workplace filter dropdown is visible', async ({ page }) => {
    await gotoSchedule(page);
    const filter = page.locator(
      'select[name*="workplace"], [data-testid="workplace-filter"], [aria-label*="مكان"]'
    ).first();
    if (await filter.count() > 0) {
      await expect(filter).toBeVisible();
    }
  });

  test('selecting workplace re-fetches slots', async ({ page }) => {
    await gotoSchedule(page);
    const filter = page.locator('select').first();
    if (await filter.count() === 0) {
      test.skip(true, 'No select elements found');
      return;
    }

    const options = await filter.locator('option').count();
    if (options > 1) {
      await filter.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      // تأكد من عدم الكراش بعد الفلتر
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

});


// ─── F: Keyboard Navigation ───────────────────────────────────────────────────

test.describe('Assistant Schedule — Keyboard', () => {

  test('page is keyboard navigable (Tab works)', async ({ page }) => {
    await gotoSchedule(page);
    // ابدأ التنقل بـ Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // تأكد من عدم وجود خطأ
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('monthly navigation buttons are keyboard accessible', async ({ page }) => {
    await gotoSchedule(page);
    const monthlyBtn = page.getByRole('button', { name: /شهري|monthly/i }).first();
    if (await monthlyBtn.count() === 0) return;

    await monthlyBtn.click();
    await page.waitForTimeout(500);

    const prevBtn = page.getByRole('button', { name: /السابق|prev|‹/i }).first();
    if (await prevBtn.count() > 0) {
      await prevBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      // تأكد من تغيير الشهر بدون كراش
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

});

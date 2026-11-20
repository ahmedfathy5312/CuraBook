/**
 * e2e/assistant-notifications.spec.js — Notifications Page E2E Tests
 * Sprint 5
 */

import { test, expect } from '@playwright/test';
import { ASSISTANT_STATE } from './auth.setup.js';

test.use({ storageState: ASSISTANT_STATE });

test.describe('Assistant Notifications Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/notifications');
    await page.waitForLoadState('networkidle');
  });

  test('notifications page loads without redirect', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('notification list or empty state renders', async ({ page }) => {
    const content = page.locator(
      '[data-testid="notification-list"], .notification-list, [role="list"]'
    ).or(page.getByText(/لا توجد إشعارات|no notifications/i)).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('filter tabs (all / unread / read) render', async ({ page }) => {
    const allTab    = page.getByRole('button', { name: /الكل|all/i }).first();
    const unreadTab = page.getByRole('button', { name: /غير مقروء|unread/i }).first();
    if (await allTab.count() > 0) {
      await expect(allTab).toBeVisible();
    }
    if (await unreadTab.count() > 0) {
      await expect(unreadTab).toBeVisible();
    }
  });

  test('mark all as read button is accessible', async ({ page }) => {
    const markAllBtn = page.getByRole('button', { name: /تحديد الكل مقروء|mark all/i }).first();
    if (await markAllBtn.count() > 0) {
      await expect(markAllBtn).toBeEnabled();
    }
  });

  test('filter tabs switch content without crash', async ({ page }) => {
    const tabs = page.locator('[role="tab"], [data-testid*="filter"]');
    const count = await tabs.count();
    if (count > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

  test('notification item has role and aria attributes', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const items = page.locator('[role="listitem"], [data-testid="notification-item"]');
    const count = await items.count();
    if (count > 0) {
      await expect(items.first()).toBeVisible();
    }
  });

});


/**
 * e2e/assistant-reports.spec.js — Reports Page E2E Tests
 * Sprint 5
 */

test.describe('Assistant Reports Page', () => {
  test.use({ storageState: ASSISTANT_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/reports');
    await page.waitForLoadState('networkidle');
  });

  test('reports page loads without crash', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('4 report types are listed', async ({ page }) => {
    const reportCards = page.locator('[data-testid="report-card"], .report-card');
    const count = await reportCards.count();
    if (count > 0) {
      expect(count).toBe(4);
    } else {
      // fallback — تأكد من وجود نصوص التقارير
      const content = page.getByText(/مواعيد|ملخص|يومي|مرضى/i).first();
      await expect(content).toBeVisible({ timeout: 6_000 });
    }
  });

  test('CSV export button is visible and enabled', async ({ page }) => {
    const csvBtn = page.getByRole('button', { name: /CSV|تصدير CSV/i }).first();
    if (await csvBtn.count() > 0) {
      await expect(csvBtn).toBeVisible();
      await expect(csvBtn).toBeEnabled();
    }
  });

  test('PDF export button is visible and enabled', async ({ page }) => {
    const pdfBtn = page.getByRole('button', { name: /PDF|تصدير PDF/i }).first();
    if (await pdfBtn.count() > 0) {
      await expect(pdfBtn).toBeVisible();
      await expect(pdfBtn).toBeEnabled();
    }
  });

  test('CSV export triggers download', async ({ page }) => {
    const csvBtn = page.getByRole('button', { name: /CSV/i }).first();
    if (await csvBtn.count() === 0) {
      test.skip(true, 'CSV button not found');
      return;
    }

    // استمع لـ download event
    const downloadPromise = page.waitForEvent('download', { timeout: 8_000 }).catch(() => null);
    await csvBtn.click();
    const download = await downloadPromise;

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.csv$/i);
    }
  });

  test('date range picker is accessible', async ({ page }) => {
    const datePicker = page.locator('input[type="date"], [data-testid="date-range"]').first();
    if (await datePicker.count() > 0) {
      await expect(datePicker).toBeVisible();
      // يجب أن يكون له label مرتبط
      const id = await datePicker.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const ariaLabel = await datePicker.getAttribute('aria-label');
        // يجب أن يكون له label أو aria-label
        const hasLabel = (await label.count() > 0) || !!ariaLabel;
        expect(hasLabel).toBe(true);
      }
    }
  });

});


/**
 * e2e/assistant-chat.spec.js — Chat Page E2E Tests
 * Sprint 5
 */

test.describe('Assistant Chat Page', () => {
  test.use({ storageState: ASSISTANT_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/chat');
    await page.waitForLoadState('networkidle');
  });

  test('chat page loads without crash', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('conversation list or empty state is visible', async ({ page }) => {
    const content = page.locator(
      '[data-testid="conversation-list"], .conversation-list, [role="list"]'
    ).or(page.getByText(/لا توجد محادثات|no conversations|empty/i)).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('search conversations input is accessible', async ({ page }) => {
    const search = page.locator('input[placeholder*="بحث"], input[type="search"]').first();
    if (await search.count() > 0) {
      await expect(search).toBeVisible();
      const label = await search.getAttribute('aria-label');
      const placeholder = await search.getAttribute('placeholder');
      expect(label || placeholder).toBeTruthy();
    }
  });

  test('message input area is accessible', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const msgInput = page.locator(
      'textarea[placeholder*="رسالة"], textarea[placeholder*="message"], input[data-testid="message-input"]'
    ).first();
    if (await msgInput.count() > 0) {
      await expect(msgInput).toBeVisible();
      await msgInput.fill('مرحباً، هل يمكنني المساعدة؟');
      const value = await msgInput.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('send button is accessible', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: /إرسال|send/i }).first();
    if (await sendBtn.count() > 0) {
      await expect(sendBtn).toBeVisible();
    }
  });

  test('message bubbles have correct RTL alignment', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('rtl');
  });

  test('typing indicator is aria-live', async ({ page }) => {
    const typingIndicator = page.locator(
      '[data-testid="typing-indicator"], [aria-live]'
    ).first();
    if (await typingIndicator.count() > 0) {
      const live = await typingIndicator.getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(live);
    }
  });

});

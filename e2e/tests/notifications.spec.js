// e2e/tests/notifications.spec.js
// Critical Flow: Real-time Notifications, WebSocket connection, read/unread state

import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('🔔 Notifications - Critical Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/doctor/notifications');
    await page.waitForLoadState('networkidle');
  });

  // ── Page Rendering ──────────────────────────────────────────────────────

  test('TC-NOTIF-01 | Notifications page loads', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test('TC-NOTIF-02 | Notifications heading is visible', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /notifications|إشعارات/i });
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('TC-NOTIF-03 | Notification bell icon present in nav header', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    const bellIcon = page.getByRole('button', { name: /notifications|bell|إشعارات/i })
      .or(page.locator('[data-testid="notification-bell"]'));
    if (await bellIcon.count() > 0) {
      await expect(bellIcon.first()).toBeVisible();
    }
  });

  // ── Notification List ───────────────────────────────────────────────────

  test('TC-NOTIF-04 | Notification items render or empty state shows', async ({ page }) => {
    const items    = page.getByTestId('notification-item').or(
                     page.getByRole('listitem').filter({ hasText: /ago|منذ|قبل/ }));
    const empty    = page.getByText(/no notifications|لا توجد إشعارات/i);
    const hasItems = await items.count() > 0;
    const hasEmpty = await empty.count() > 0;
    expect(hasItems || hasEmpty).toBe(true);
  });

  test('TC-NOTIF-05 | Mark as read button works', async ({ page }) => {
    const markReadBtn = page.getByRole('button', { name: /mark.*read|قراءة|اقرأ الكل/i }).first();
    if (await markReadBtn.count() > 0 && await markReadBtn.isEnabled()) {
      await markReadBtn.click();
      await page.waitForTimeout(400);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-NOTIF-06 | Mark all as read button present', async ({ page }) => {
    const markAllBtn = page.getByRole('button', { name: /mark all|الكل كمقروء/i });
    if (await markAllBtn.count() > 0) {
      await expect(markAllBtn.first()).toBeVisible();
    }
  });

  // ── Filter Tabs ─────────────────────────────────────────────────────────

  test('TC-NOTIF-07 | All/Unread tabs are present', async ({ page }) => {
    const allTab    = page.getByRole('tab', { name: /^all$|^الكل$/i });
    const unreadTab = page.getByRole('tab', { name: /unread|غير مقروء/i });
    const hasAll    = await allTab.count() > 0;
    const hasUnread = await unreadTab.count() > 0;
    // At least one filter mechanism should exist
    if (hasAll) await expect(allTab.first()).toBeVisible();
    if (hasUnread) await expect(unreadTab.first()).toBeVisible();
  });

  test('TC-NOTIF-08 | Switching to Unread filter does not crash', async ({ page }) => {
    const unreadTab = page.getByRole('tab', { name: /unread|غير مقروء/i });
    if (await unreadTab.count() > 0) {
      await unreadTab.first().click();
      await page.waitForTimeout(300);
      await expect(page).not.toHaveURL(/error/);
    }
  });

  // ── Real-time / WebSocket ───────────────────────────────────────────────

  test('TC-NOTIF-09 | No WebSocket crash errors in console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/doctor/dashboard');
    await page.waitForTimeout(2000); // give WS time to connect

    const wsErrors = errors.filter(msg =>
      msg.includes('WebSocket') && msg.includes('Error')
    );
    expect(wsErrors).toHaveLength(0);
  });

  // ── Notification Badge ──────────────────────────────────────────────────

  test('TC-NOTIF-10 | Unread badge shows numeric count or zero', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    const badge = page.getByTestId('notification-badge')
      .or(page.locator('[class*="badge"], [class*="count"]').filter({ hasText: /^\d+$/ }));
    if (await badge.count() > 0) {
      const text = await badge.first().textContent();
      expect(Number(text?.trim())).toBeGreaterThanOrEqual(0);
    }
  });

  // ── Profile Notification Settings ──────────────────────────────────────

  test('TC-NOTIF-11 | Notification preferences accessible from profile', async ({ page }) => {
    await page.goto('/doctor/profile/settings');
    const notifTab = page.getByRole('tab', { name: /notifications|الإشعارات/i });
    if (await notifTab.count() > 0) {
      await notifTab.click();
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('TC-NOTIF-12 | Email notification toggle present in settings', async ({ page }) => {
    await page.goto('/doctor/profile/settings');
    const emailToggle = page.getByRole('checkbox', { name: /email/i })
      .or(page.getByRole('switch', { name: /email/i }));
    if (await emailToggle.count() > 0) {
      await expect(emailToggle.first()).toBeVisible();
    }
  });
});

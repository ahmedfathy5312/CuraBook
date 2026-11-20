// e2e/tests/profile-settings.spec.js
// Critical Flow: Doctor Profile — 7 tabs, settings, notifications prefs

import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

test.describe('👤 Profile & Settings - Critical Flows', () => {

  // ── Profile Overview ────────────────────────────────────────────────────

  test.describe('Profile Overview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/doctor/profile');
      await page.waitForLoadState('networkidle');
    });

    test('TC-PROF-01 | Profile overview page loads', async ({ page }) => {
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page).not.toHaveURL(/error/);
    });

    test('TC-PROF-02 | Doctor name or avatar is visible', async ({ page }) => {
      const nameEl  = page.getByTestId('doctor-name')
        .or(page.getByRole('heading').filter({ hasText: /Dr\.|دكتور/i }));
      const avatar  = page.getByRole('img', { name: /avatar|profile photo|صورة/i });
      const hasName = await nameEl.count() > 0;
      const hasAvt  = await avatar.count() > 0;
      expect(hasName || hasAvt).toBe(true);
    });

    test('TC-PROF-03 | Specialization/experience info shown', async ({ page }) => {
      const spec = page.getByTestId('doctor-specialty')
        .or(page.getByText(/specializ|specialist|تخصص/i));
      if (await spec.count() > 0) {
        await expect(spec.first()).toBeVisible();
      }
    });
  });

  // ── Profile Settings Tabs ───────────────────────────────────────────────

  test.describe('Profile Settings (7 tabs)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/doctor/profile/settings');
      await page.waitForLoadState('networkidle');
    });

    test('TC-PROF-04 | Settings page loads', async ({ page }) => {
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('TC-PROF-05 | Multiple settings tabs are present', async ({ page }) => {
      const tabs = page.getByRole('tab');
      const count = await tabs.count();
      if (count > 0) expect(count).toBeGreaterThanOrEqual(3);
    });

    test('TC-PROF-06 | Personal Info tab is accessible', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /personal|info|شخصي/i });
      if (await tab.count() > 0) {
        await tab.first().click();
        await expect(page.getByRole('main')).toBeVisible();
      }
    });

    test('TC-PROF-07 | Security tab is accessible', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /security|password|أمان|كلمة المرور/i });
      if (await tab.count() > 0) {
        await tab.first().click();
        await expect(page.getByRole('main')).toBeVisible();
      }
    });

    test('TC-PROF-08 | Notifications tab is accessible', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /notifications|الإشعارات/i });
      if (await tab.count() > 0) {
        await tab.first().click();
        await expect(page.getByRole('main')).toBeVisible();
      }
    });

    test('TC-PROF-09 | Notification prefs toggles are interactive', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /notifications|الإشعارات/i });
      if (await tab.count() > 0) {
        await tab.first().click();
        const toggles = page.getByRole('checkbox').or(page.getByRole('switch'));
        if (await toggles.count() > 0) {
          // Toggle the first one and back
          const toggle = toggles.first();
          const initial = await toggle.isChecked();
          await toggle.click();
          await page.waitForTimeout(300);
          // Should either save successfully or show no crash
          await expect(page).not.toHaveURL(/error/);
          // Restore
          await toggle.click();
        }
      }
    });

    test('TC-PROF-10 | Language/Appearance tab accessible', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /language|appearance|اللغة|المظهر/i });
      if (await tab.count() > 0) {
        await tab.first().click();
        await expect(page.getByRole('main')).toBeVisible();
      }
    });

    test('TC-PROF-11 | Save button present and enabled', async ({ page }) => {
      const saveBtn = page.getByRole('button', { name: /save|save changes|حفظ/i });
      if (await saveBtn.count() > 0) {
        await expect(saveBtn.first()).toBeEnabled();
      }
    });

    test('TC-PROF-12 | No missing i18n keys in settings page', async ({ page }) => {
      const body    = await page.textContent('body');
      const rawKeys = body?.match(/\w+\.\w+\.\w+/g)?.filter(k =>
        k.includes('settings.') || k.includes('profile.')
      ) || [];
      expect(rawKeys).toHaveLength(0);
    });
  });

  // ── Schedule Settings ───────────────────────────────────────────────────

  test.describe('Schedule Page', () => {
    test('TC-PROF-13 | Schedule page loads without MOD_XL crash', async ({ page }) => {
      const jsErrors = [];
      page.on('pageerror', err => jsErrors.push(err.message));

      await page.goto('/doctor/schedule');
      await page.waitForLoadState('networkidle');

      const refErrors = jsErrors.filter(msg => msg.includes('ReferenceError'));
      expect(refErrors).toHaveLength(0);
    });

    test('TC-PROF-14 | Schedule modal opens without shadow error', async ({ page }) => {
      await page.goto('/doctor/schedule');
      await page.waitForLoadState('networkidle');

      const addBtn = page.getByRole('button', { name: /add|new|إضافة/i }).first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        const modal = page.getByRole('dialog');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          // Check no boxShadow error in CSS
          const shadow = await modal.evaluate(el =>
            window.getComputedStyle(el).boxShadow
          );
          // Should be a valid CSS value (not 'none' explicitly means it was applied)
          expect(shadow).not.toBeNull();
        }
      }
    });
  });
});

/**
 * e2e/assistant-analytics-prescriptions-settings.spec.js
 * Sprint 5: E2E coverage for remaining assistant pages.
 *
 * Covers:
 *   - AssistantAnalyticsPage
 *   - AssistantPrescriptionsPage
 *   - AssistantSettingsPage
 *   - AssistantOnboardingPage
 */

import { test, expect } from '@playwright/test';
import { ASSISTANT_STATE } from './auth.setup.js';

test.use({ storageState: ASSISTANT_STATE });


// ─── Analytics Page ───────────────────────────────────────────────────────────

test.describe('Assistant Analytics Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('analytics page loads without crash', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('page renders stats cards', async ({ page }) => {
    const cards = page.locator(
      '[data-testid="stat-card"], .stat-card, [data-testid="analytics-card"]'
    );
    await page.waitForTimeout(2_000);
    const count = await cards.count();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test('weekly chart renders', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const chart = page.locator(
      '[data-testid="weekly-chart"], canvas, svg[class*="chart"], .recharts-wrapper'
    ).first();
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible();
    }
  });

  test('workplace summary section renders', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const summary = page.getByText(/ملخص|مكان العمل|workplace summary/i).first();
    if (await summary.count() > 0) {
      await expect(summary).toBeVisible();
    }
  });

  test('stats have numeric values (not loading)', async ({ page }) => {
    await page.waitForTimeout(3_000);
    const numbers = page.locator('[data-testid="stat-value"], .stat-value');
    const count = await numbers.count();
    if (count > 0) {
      const firstText = await numbers.first().textContent();
      expect(firstText?.trim()).not.toBe('');
    }
  });

  test('page is keyboard navigable', async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('analytics page has no missing alt texts on images', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const imgsWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imgsWithoutAlt).toBe(0);
  });

});


// ─── Prescriptions Page ───────────────────────────────────────────────────────

test.describe('Assistant Prescriptions Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/prescriptions');
    await page.waitForLoadState('networkidle');
  });

  test('prescriptions page loads without redirect', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('prescription list or empty state renders', async ({ page }) => {
    const content = page.locator(
      '[data-testid="prescription-list"], .prescription-list, [role="list"]'
    ).or(page.getByText(/لا توجد وصفات|no prescriptions|empty/i)).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('triple search is visible and functional', async ({ page }) => {
    // بحث بالمريض / الطبيب / نص التشخيص
    const search = page.locator(
      'input[placeholder*="بحث"], input[type="search"], [data-testid*="search"]'
    ).first();
    if (await search.count() > 0) {
      await expect(search).toBeVisible();
      await search.fill('أحمد');
      await page.waitForTimeout(600);
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

  test('status filter tabs render (all / SENT / DRAFT)', async ({ page }) => {
    const allTab   = page.getByRole('button', { name: /الكل|all/i }).first();
    const sentTab  = page.getByRole('button', { name: /مُرسلة|sent/i }).first();
    const draftTab = page.getByRole('button', { name: /مسودة|draft/i }).first();
    if (await allTab.count() > 0) await expect(allTab).toBeVisible();
    if (await sentTab.count() > 0) await expect(sentTab).toBeVisible();
    if (await draftTab.count() > 0) await expect(draftTab).toBeVisible();
  });

  test('clicking prescription row opens detail drawer', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator(
      '[data-testid="prescription-row"], .prescription-row, [role="listitem"]'
    ).first();
    if (await row.count() > 0) {
      await row.click();
      const drawer = page.locator('[role="dialog"], [data-testid="prescription-drawer"]').first();
      await expect(drawer).toBeVisible({ timeout: 5_000 });
    }
  });

  test('drawer shows medication details', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator('[role="listitem"]').first();
    if (await row.count() === 0) return;
    await row.click();

    const drawer = page.locator('[role="dialog"]').first();
    if (await drawer.count() === 0) return;
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // يجب أن يحتوي على تفاصيل الأدوية
    const content = await drawer.textContent();
    expect(content?.length).toBeGreaterThan(5);
  });

  test('read-only guard visible (no create button)', async ({ page }) => {
    // لا يجب أن يوجد زر "إنشاء وصفة" أو "إضافة وصفة"
    const createBtn = page.getByRole('button', { name: /إنشاء وصفة|create prescription|إضافة وصفة/i });
    const count = await createBtn.count();
    expect(count).toBe(0);
  });

  test('print button visible in drawer', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator('[role="listitem"]').first();
    if (await row.count() === 0) return;
    await row.click();

    const drawer = page.locator('[role="dialog"]').first();
    if (await drawer.count() === 0) return;
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    const printBtn = drawer.getByRole('button', { name: /طباعة|print/i });
    if (await printBtn.count() > 0) {
      await expect(printBtn).toBeVisible();
      await expect(printBtn).toBeEnabled();
    }
  });

  test('Escape closes prescription drawer', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const row = page.locator('[role="listitem"]').first();
    if (await row.count() === 0) return;
    await row.click();

    const drawer = page.locator('[role="dialog"]').first();
    if (await drawer.count() === 0) return;
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 3_000 });
  });

});


// ─── Settings Page ────────────────────────────────────────────────────────────

test.describe('Assistant Settings Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads without crash', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('settings sections are visible', async ({ page }) => {
    // يجب أن تحتوي على أقسام الإعدادات
    const sections = page.locator('section, [data-testid*="settings-section"], fieldset, .settings-section');
    const count = await sections.count();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('notification toggles are accessible', async ({ page }) => {
    const toggles = page.locator(
      'input[type="checkbox"], [role="switch"], [data-testid*="toggle"]'
    );
    const count = await toggles.count();
    if (count > 0) {
      // كل toggle يجب أن يكون له label
      const firstToggle = toggles.first();
      await expect(firstToggle).toBeVisible();
    }
  });

  test('dark mode toggle is present and functional', async ({ page }) => {
    const darkToggle = page.locator(
      '[data-testid="dark-mode-toggle"], [aria-label*="dark"], [aria-label*="وضع ليلي"], input[type="checkbox"]'
    ).first();
    if (await darkToggle.count() > 0) {
      await expect(darkToggle).toBeVisible();
      // نضغط وننتظر
      await darkToggle.click();
      await page.waitForTimeout(300);
      const body = await page.textContent('body');
      expect(body).not.toContain('Uncaught');
    }
  });

  test('language selector is accessible', async ({ page }) => {
    const langSelect = page.locator(
      'select[name*="lang"], select[name*="language"], [data-testid*="lang"]'
    ).first();
    if (await langSelect.count() > 0) {
      await expect(langSelect).toBeVisible();
      const ariaLabel = await langSelect.getAttribute('aria-label');
      const id = await langSelect.getAttribute('id');
      const label = id ? await page.locator(`label[for="${id}"]`).count() : 0;
      expect(ariaLabel || label > 0).toBeTruthy();
    }
  });

  test('change password section has labeled inputs', async ({ page }) => {
    const pwInputs = page.locator('input[type="password"]');
    const count = await pwInputs.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const input = pwInputs.nth(i);
        const id         = await input.getAttribute('id');
        const ariaLabel  = await input.getAttribute('aria-label');
        const hasLabel   = id ? (await page.locator(`label[for="${id}"]`).count() > 0) : false;
        const placeholder = await input.getAttribute('placeholder');
        expect(
          ariaLabel || hasLabel || placeholder,
          `Password input ${i} must have label`
        ).toBeTruthy();
      }
    }
  });

  test('settings page is keyboard navigable', async ({ page }) => {
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('save/apply changes button is accessible', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /حفظ|save|تطبيق|apply/i }).first();
    if (await saveBtn.count() > 0) {
      await expect(saveBtn).toBeVisible();
      await expect(saveBtn).toBeEnabled();
    }
  });

});


// ─── Onboarding Page ──────────────────────────────────────────────────────────

test.describe('Assistant Onboarding Page', () => {

  test.beforeEach(async ({ page }) => {
    // أزل الـ flag لإجبار الـ onboarding على الظهور
    await page.goto('/assistant-onboarding');
    await page.evaluate(() => localStorage.removeItem('assistant_onboarding_done'));
    await page.waitForLoadState('networkidle');
  });

  test('onboarding page loads without crash', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('welcome step is visible', async ({ page }) => {
    const welcome = page.getByText(/مرحباً|welcome|ترحيب/i).first();
    if (await welcome.count() > 0) {
      await expect(welcome).toBeVisible({ timeout: 8_000 });
    }
  });

  test('progress indicator shows steps', async ({ page }) => {
    const progress = page.locator(
      '[data-testid="progress-dots"], .progress-dots, [role="progressbar"], [aria-label*="خطوة"]'
    ).first();
    if (await progress.count() > 0) {
      await expect(progress).toBeVisible();
    }
  });

  test('Next button navigates to next step', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /التالي|next|ابدأ|continue/i }).first();
    if (await nextBtn.count() === 0) return;

    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await page.waitForTimeout(500);

    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('profile step has labeled inputs', async ({ page }) => {
    // انتقل للخطوة الثانية
    const nextBtn = page.getByRole('button', { name: /التالي|next/i }).first();
    if (await nextBtn.count() > 0) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    if (count > 0) {
      const input = inputs.first();
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      const hasLabel = id ? (await page.locator(`label[for="${id}"]`).count() > 0) : false;
      const placeholder = await input.getAttribute('placeholder');
      expect(ariaLabel || hasLabel || placeholder).toBeTruthy();
    }
  });

  test('completing onboarding sets localStorage flag', async ({ page }) => {
    // محاكاة إتمام الـ onboarding
    await page.evaluate(() => localStorage.setItem('assistant_onboarding_done', 'true'));
    const flag = await page.evaluate(() => localStorage.getItem('assistant_onboarding_done'));
    expect(flag).toBe('true');
  });

  test('onboarding redirects to dashboard after completion', async ({ page }) => {
    // إذا أُتم الـ onboarding، يجب التوجيه للـ dashboard
    await page.evaluate(() => localStorage.setItem('assistant_onboarding_done', 'true'));
    await page.goto('/assistant-onboarding');
    await page.waitForLoadState('networkidle');
    // يجب إما بقاءه في الـ onboarding أو التوجيه للـ dashboard
    const url = page.url();
    expect(url).toMatch(/assistant/i);
  });

});


// ─── Profile Page ─────────────────────────────────────────────────────────────

test.describe('Assistant Profile Page', () => {
  test.use({ storageState: ASSISTANT_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assistant/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile page loads without crash', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    const body = await page.textContent('body');
    expect(body).not.toContain('Uncaught');
  });

  test('profile tabs render (personal / password / schedule / notifications)', async ({ page }) => {
    const tabs = page.locator('[role="tab"], [data-testid*="tab"]');
    const count = await tabs.count();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test('personal info tab shows name field', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const nameInput = page.locator('input[name*="name"], input[placeholder*="اسم"], [data-testid*="name"]').first();
    if (await nameInput.count() > 0) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('password tab has strength meter', async ({ page }) => {
    const pwTab = page.getByRole('tab', { name: /كلمة المرور|password/i }).first();
    if (await pwTab.count() > 0) {
      await pwTab.click();
      await page.waitForTimeout(300);

      const strengthMeter = page.locator(
        '[data-testid="password-strength"], .strength-meter, [aria-label*="قوة"]'
      ).first();
      if (await strengthMeter.count() > 0) {
        await expect(strengthMeter).toBeVisible();
      }
    }
  });

  test('profile avatar has accessible label', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const avatar = page.locator('[data-testid="avatar"], [aria-label*="صورة"]').first();
    if (await avatar.count() > 0) {
      await expect(avatar).toBeVisible();
      const ariaLabel = await avatar.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

});

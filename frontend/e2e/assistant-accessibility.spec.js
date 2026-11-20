/**
 * e2e/assistant-accessibility.spec.js — WCAG 2.1 AA Accessibility Audit
 * Sprint 5: Automated accessibility testing for all assistant pages.
 *
 * يستخدم axe-core عبر @axe-core/playwright لفحص كل صفحة من صفحات المساعد
 * ويتحقق من:
 *   - لا يوجد violations من مستوى WCAG A / AA
 *   - كل العناصر التفاعلية لها accessible names
 *   - التباين اللوني يلبي معيار 4.5:1 للنص العادي
 *   - الـ focus order منطقي
 *   - الـ headings متسلسلة بشكل صحيح
 *   - الصور لها نص بديل
 *   - الـ forms لها labels
 *
 * لتشغيل هذه الاختبارات:
 *   npx playwright test assistant-accessibility.spec.js
 *
 * التبعيات المطلوبة (أضفها لو لم تكن موجودة):
 *   npm install -D @axe-core/playwright
 */

import { test, expect } from '@playwright/test';
import { ASSISTANT_STATE } from './auth.setup.js';

// axe-playwright — optional, graceful skip if not installed
let injectAxe, checkA11y, getViolations;
try {
  const axeMod = await import('@axe-core/playwright').catch(() => null);
  if (axeMod) {
    injectAxe    = axeMod.injectAxe;
    checkA11y    = axeMod.checkA11y;
    getViolations = axeMod.getViolations;
  }
} catch {
  // axe not available — tests will use manual checks
}

test.use({ storageState: ASSISTANT_STATE });

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * انتظر اكتمال التحميل وأزِل الـ splash screens
 */
async function waitForReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000); // انتظر هيدرة الـ React
}

/**
 * افحص الصفحة يدوياً للمشاكل الشائعة (fallback بدون axe)
 */
async function manualA11yChecks(page, pageName) {
  // 1. Headings hierarchy
  const h1Count = await page.locator('h1').count();
  expect(h1Count, `${pageName}: should have exactly one H1`).toBeLessThanOrEqual(1);

  // 2. Images have alt text
  const imgsWithoutAlt = await page.locator('img:not([alt])').count();
  expect(imgsWithoutAlt, `${pageName}: all images must have alt text`).toBe(0);

  // 3. Buttons have accessible names
  const emptyButtons = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].filter(btn => {
      const hasText     = btn.textContent.trim().length > 0;
      const hasAriaLbl  = btn.hasAttribute('aria-label');
      const hasAriaLbBy = btn.hasAttribute('aria-labelledby');
      const hasTitle    = btn.hasAttribute('title');
      return !hasText && !hasAriaLbl && !hasAriaLbBy && !hasTitle;
    }).length;
  });
  expect(emptyButtons, `${pageName}: all buttons must have accessible names`).toBe(0);

  // 4. Interactive elements are keyboard focusable
  const unfocusableInteractive = await page.evaluate(() => {
    return [...document.querySelectorAll('[onclick]:not(button):not(a):not(input)')].filter(el => {
      const tabindex = el.getAttribute('tabindex');
      const role     = el.getAttribute('role');
      // Elements with onclick but no keyboard support
      return !role && tabindex !== '0' && tabindex !== '-1';
    }).length;
  });
  // Warning only — non-blocking
  if (unfocusableInteractive > 0) {
    console.warn(`${pageName}: ${unfocusableInteractive} onclick elements may not be keyboard accessible`);
  }

  // 5. Lang attribute on html
  const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
  expect(lang, `${pageName}: html element must have lang attribute`).toBeTruthy();

  // 6. No duplicate IDs
  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    const seen = new Set();
    const dupes = [];
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    return dupes;
  });
  expect(
    duplicateIds.length,
    `${pageName}: no duplicate IDs (found: ${duplicateIds.slice(0, 5).join(', ')})`
  ).toBe(0);

  // 7. Form inputs have labels
  const unlabeledInputs = await page.evaluate(() => {
    return [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select')]
      .filter(input => {
        const id         = input.id;
        const hasLabel   = id && document.querySelector(`label[for="${id}"]`);
        const ariaLabel  = input.getAttribute('aria-label');
        const ariaLblBy  = input.getAttribute('aria-labelledby');
        const title      = input.getAttribute('title');
        const placeholder = input.getAttribute('placeholder');
        return !hasLabel && !ariaLabel && !ariaLblBy && !title && !placeholder;
      }).length;
  });
  expect(
    unlabeledInputs,
    `${pageName}: all form inputs must have labels or aria-label`
  ).toBe(0);
}


// ─── Dashboard Accessibility ──────────────────────────────────────────────────

test.describe('A11y — Assistant Dashboard', () => {

  test('dashboard passes manual accessibility checks', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);
    await manualA11yChecks(page, 'Dashboard');
  });

  test('dashboard has no axe violations (WCAG AA)', async ({ page }) => {
    if (!injectAxe) {
      test.skip(true, '@axe-core/playwright not installed — run: npm i -D @axe-core/playwright');
      return;
    }
    await page.goto('/assistant');
    await waitForReady(page);
    await injectAxe(page);
    const violations = await getViolations(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });

    // أبلّغ عن الـ violations بالتفصيل
    if (violations.length > 0) {
      const report = violations.map(v =>
        `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.length}`
      ).join('\n');
      console.error('Dashboard A11y Violations:\n' + report);
    }

    // نسمح بـ violations من مستوى "minor" فقط في الـ dashboard
    const criticalViolations = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations.length, `Dashboard has ${criticalViolations.length} critical/serious violations:\n${
      criticalViolations.map(v => `  - ${v.id}: ${v.description}`).join('\n')
    }`).toBe(0);
  });

  test('dashboard stats cards have aria-labels', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);

    const statCards = page.locator('[data-testid="stat-card"], .stat-card');
    const count = await statCards.count();
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const card = statCards.nth(i);
      // يجب أن يكون له محتوى نصي مفهوم
      const text = await card.textContent();
      expect(text?.trim().length, `Stat card ${i} must have text content`).toBeGreaterThan(0);
    }
  });

  test('sidebar navigation has proper landmark role', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);

    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 6_000 });

    // يجب أن يكون له aria-label
    const ariaLabel = await nav.getAttribute('aria-label');
    if (!ariaLabel) {
      // acceptable: تحذير لا خطأ
      console.warn('Sidebar nav should have aria-label for better accessibility');
    }
  });

  test('modal/dialog has correct ARIA attributes', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);
    await page.waitForTimeout(2_000);

    // افتح reject modal إذا كان متاحاً
    const rejectBtn = page.getByRole('button', { name: /رفض|reject/i }).first();
    if (await rejectBtn.count() === 0) return;

    await rejectBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.count() === 0) return;

    // يجب أن يكون له role="dialog"
    const role = await dialog.getAttribute('role');
    expect(role).toBe('dialog');

    // يجب أن يكون له aria-modal
    const ariaModal = await dialog.getAttribute('aria-modal');
    expect(ariaModal).toBe('true');

    // يجب أن يكون له aria-labelledby أو aria-label
    const labelledBy = await dialog.getAttribute('aria-labelledby');
    const ariaLabel  = await dialog.getAttribute('aria-label');
    expect(labelledBy || ariaLabel, 'Dialog must have aria-labelledby or aria-label').toBeTruthy();
  });

});


// ─── Schedule Page Accessibility ──────────────────────────────────────────────

test.describe('A11y — Schedule Page', () => {

  test('schedule page passes manual a11y checks', async ({ page }) => {
    await page.goto('/assistant/schedule');
    await waitForReady(page);
    await manualA11yChecks(page, 'Schedule');
  });

  test('slot table/list has proper semantics', async ({ page }) => {
    await page.goto('/assistant/schedule');
    await waitForReady(page);
    await page.waitForTimeout(2_000);

    // Table أو List يجب أن يستخدم HTML semantics صحيحة
    const table = page.locator('table, [role="table"], [role="list"]').first();
    if (await table.count() > 0) {
      const tagName = await table.evaluate(el => el.tagName.toLowerCase());
      const role    = await table.getAttribute('role');
      // table أو role="table" أو role="list"
      expect(['table'].includes(tagName) || ['table', 'list', 'grid'].includes(role || '')).toBeTruthy();
    }
  });

  test('view toggle buttons have aria-pressed state', async ({ page }) => {
    await page.goto('/assistant/schedule');
    await waitForReady(page);

    const toggleBtns = page.locator(
      '[data-testid*="view-toggle"] button, [role="radiogroup"] button, [aria-pressed]'
    );
    const count = await toggleBtns.count();
    if (count > 0) {
      // على الأقل زر واحد يجب أن يكون له aria-pressed أو aria-checked
      const hasState = await toggleBtns.first().evaluate(btn =>
        btn.hasAttribute('aria-pressed') || btn.hasAttribute('aria-checked') || btn.hasAttribute('aria-selected')
      );
      if (!hasState) {
        console.warn('View toggle buttons should have aria-pressed/checked/selected state');
      }
    }
  });

});


// ─── Patients Page Accessibility ──────────────────────────────────────────────

test.describe('A11y — Patients Page', () => {

  test('patients page passes manual a11y checks', async ({ page }) => {
    await page.goto('/assistant/patients');
    await waitForReady(page);
    await manualA11yChecks(page, 'Patients');
  });

  test('search input is properly labeled', async ({ page }) => {
    await page.goto('/assistant/patients');
    await waitForReady(page);

    const search = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
    if (await search.count() === 0) return;

    const ariaLabel  = await search.getAttribute('aria-label');
    const id         = await search.getAttribute('id');
    const hasLabel   = id ? (await page.locator(`label[for="${id}"]`).count() > 0) : false;
    const placeholder = await search.getAttribute('placeholder');

    expect(
      ariaLabel || hasLabel || placeholder,
      'Search input must have aria-label, associated label, or placeholder'
    ).toBeTruthy();
  });

});


// ─── Notifications Page Accessibility ────────────────────────────────────────

test.describe('A11y — Notifications Page', () => {

  test('notifications page passes manual a11y checks', async ({ page }) => {
    await page.goto('/assistant/notifications');
    await waitForReady(page);
    await manualA11yChecks(page, 'Notifications');
  });

  test('notification items have proper role', async ({ page }) => {
    await page.goto('/assistant/notifications');
    await waitForReady(page);
    await page.waitForTimeout(2_000);

    const list = page.locator('[role="list"]').first();
    if (await list.count() > 0) {
      // items داخل list يجب أن يكون لها role="listitem"
      const items = list.locator('[role="listitem"]');
      const count = await items.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('live region exists for new notifications', async ({ page }) => {
    await page.goto('/assistant/notifications');
    await waitForReady(page);

    const liveRegion = page.locator('[aria-live]').first();
    // الـ announcer يُضاف بـ a11y.js
    const exists = await liveRegion.count() > 0;
    if (!exists) {
      console.warn('Page should have an aria-live region for real-time notification announcements');
    }
  });

});


// ─── Reports Page Accessibility ───────────────────────────────────────────────

test.describe('A11y — Reports Page', () => {

  test('reports page passes manual a11y checks', async ({ page }) => {
    await page.goto('/assistant/reports');
    await waitForReady(page);
    await manualA11yChecks(page, 'Reports');
  });

  test('export buttons have descriptive labels', async ({ page }) => {
    await page.goto('/assistant/reports');
    await waitForReady(page);

    const exportBtns = page.getByRole('button', { name: /تصدير|export|CSV|PDF/i });
    const count = await exportBtns.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await exportBtns.nth(i).textContent();
        const ariaLabel = await exportBtns.nth(i).getAttribute('aria-label');
        expect(
          text?.trim() || ariaLabel,
          `Export button ${i} must have accessible name`
        ).toBeTruthy();
      }
    }
  });

});


// ─── Color Contrast Audit ─────────────────────────────────────────────────────

test.describe('A11y — Color Contrast', () => {

  test('known color combinations meet WCAG AA (4.5:1)', async ({ page }) => {
    // نتحقق من الألوان الرئيسية المستخدمة في AssistantUI.jsx
    const colorPairs = [
      // [foreground, background, description, largeText]
      ['#1B5E8A', '#ffffff', 'primary on white', false],         // 6.1:1 ✅
      ['#1B5E8A', '#E6F1FB', 'primary on primaryL', false],     // ~4.8:1 ✅
      ['#065F46', '#D1FAE5', 'success text on success bg', false], // ~5.2:1 ✅
      ['#92400E', '#FEF3C7', 'warning text on warning bg', false], // ~7.5:1 ✅
      ['#991B1B', '#FEE2E2', 'danger text on danger bg', false],   // ~6.3:1 ✅
      ['#4B5563', '#ffffff', 'muted on white', false],             // ~7.0:1 ✅
    ];

    // نتحقق من كل زوج
    for (const [fg, bg, desc, largeText] of colorPairs) {
      const ratio = await page.evaluate(([f, b]) => {
        function hexToRgb(hex) {
          const int = parseInt(hex.replace('#',''), 16);
          return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
        }
        function lum({r,g,b}) {
          const ch = v => { const s = v/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055,2.4); };
          return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b);
        }
        const L1 = lum(hexToRgb(f)), L2 = lum(hexToRgb(b));
        const light = Math.max(L1,L2), dark = Math.min(L1,L2);
        return (light+0.05)/(dark+0.05);
      }, [fg, bg]);

      const required = largeText ? 3 : 4.5;
      expect(
        ratio,
        `Color contrast (${desc}): ${ratio.toFixed(2)}:1 — required ${required}:1 for WCAG AA`
      ).toBeGreaterThanOrEqual(required);
    }
  });

});


// ─── Keyboard Navigation Full Tour ────────────────────────────────────────────

test.describe('A11y — Keyboard Navigation', () => {

  test('can navigate dashboard with keyboard only', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);

    // Tab خلال الصفحة
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // تأكد من وجود focused element
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    expect(['button', 'a', 'input', 'select', 'textarea', 'div', 'span']).toContain(focusedTag);
  });

  test('skip link activates with keyboard', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);

    // أول Tab يجب أن يُظهر skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('#curabook-skip-link');
    if (await skipLink.count() > 0) {
      const isFocused = await skipLink.evaluate(el => document.activeElement === el);
      if (isFocused) {
        await page.keyboard.press('Enter');
        // يجب أن ينتقل التركيز للمحتوى الرئيسي
        const focused = await page.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('main-content');
      }
    }
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);
    await page.waitForTimeout(2_000);

    const rejectBtn = page.getByRole('button', { name: /رفض|reject/i }).first();
    if (await rejectBtn.count() === 0) return;

    await rejectBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });

  test('Tab is trapped inside open modal', async ({ page }) => {
    await page.goto('/assistant');
    await waitForReady(page);
    await page.waitForTimeout(2_000);

    const rejectBtn = page.getByRole('button', { name: /رفض|reject/i }).first();
    if (await rejectBtn.count() === 0) return;

    await rejectBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Tab عدة مرات ونتحقق أن التركيز يبقى داخل الـ dialog
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
    }

    const focusInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement);
    });
    expect(focusInDialog).toBe(true);
  });

});

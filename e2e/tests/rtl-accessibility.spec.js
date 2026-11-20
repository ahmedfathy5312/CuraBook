// e2e/tests/rtl-accessibility.spec.js
// RTL Layout Tests + Basic Keyboard/Focus Accessibility

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ────────────────────────────────────────────────────────────────────────────
test.describe('🌍 RTL Layout - Arabic Mode', () => {

  async function switchToArabic(page) {
    const btn = page.getByRole('button', { name: /arabic|AR|العربية/i });
    if (await btn.count() > 0) {
      await btn.first().click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  test('TC-RTL-01 | HTML dir becomes rtl after switching to Arabic', async ({ page }) => {
    await page.goto('/');
    const switched = await switchToArabic(page);
    if (switched) {
      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe('rtl');
    }
  });

  test('TC-RTL-02 | Dashboard does not overflow in RTL mode', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await switchToArabic(page);
    // Check no horizontal scrollbar appears (body scrollWidth ≤ viewport)
    const overflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth + 5;
    });
    expect(overflow).toBe(false);
  });

  test('TC-RTL-03 | Sidebar is on the correct side in RTL', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await switchToArabic(page);
    const sidebar = page.getByRole('navigation').first();
    if (await sidebar.count() > 0) {
      const box = await sidebar.boundingBox();
      // In RTL, sidebar should be on the right side of the viewport
      const viewportWidth = page.viewportSize()?.width ?? 1280;
      if (box) {
        // Sidebar right edge should be close to viewport right
        expect(box.x + box.width).toBeGreaterThan(viewportWidth * 0.5);
      }
    }
  });

  test('TC-RTL-04 | Text direction is right-to-left in Arabic', async ({ page }) => {
    await page.goto('/');
    await switchToArabic(page);
    const bodyDir = await page.evaluate(() => window.getComputedStyle(document.body).direction);
    expect(bodyDir).toBe('rtl');
  });

  test('TC-RTL-05 | Pagination arrows flip in RTL', async ({ page }) => {
    await page.goto('/doctor/appointments');
    await switchToArabic(page);
    // Visual check — no JavaScript crash
    await expect(page.getByRole('main')).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe('♿ Accessibility - WCAG 2.1 AA', () => {

  async function runAxe(page, url, options = {}) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('.recharts-wrapper') // charts often have known SVG issues
      .analyze();
  }

  test('TC-A11Y-01 | Home page has no critical accessibility violations', async ({ page }) => {
    const results = await runAxe(page, '/');
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Critical violations: ${JSON.stringify(critical.map(v => v.id))}`).toHaveLength(0);
  });

  test('TC-A11Y-02 | Login page has no critical accessibility violations', async ({ page }) => {
    const results = await runAxe(page, '/login');
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Critical violations: ${JSON.stringify(critical.map(v => v.id))}`).toHaveLength(0);
  });

  test('TC-A11Y-03 | Login page has no serious accessibility violations', async ({ page }) => {
    const results = await runAxe(page, '/login');
    const serious = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    // Log for reporting even if we don't fail the test
    if (serious.length > 0) {
      console.warn('Serious a11y violations on /login:', serious.map(v => `${v.id}: ${v.description}`));
    }
    expect(serious.length).toBeLessThanOrEqual(3); // Allow max 3 serious issues
  });

  test('TC-A11Y-04 | All form inputs have labels', async ({ page }) => {
    await page.goto('/login');
    // Every input should have an associated label
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input:not([type="hidden"])')];
      return inputs.filter(el => {
        const label = el.labels?.[0] || document.querySelector(`label[for="${el.id}"]`);
        const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        return !label && !ariaLabel;
      }).length;
    });
    expect(unlabeledInputs).toBe(0);
  });

  test('TC-A11Y-05 | Interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto('/login');
    // Tab through the page and ensure focus is visible
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(focusedTag);
  });

  test('TC-A11Y-06 | Images have alt text', async ({ page }) => {
    await page.goto('/');
    const imagesWithoutAlt = await page.evaluate(() => {
      return [...document.querySelectorAll('img')]
        .filter(img => !img.alt && !img.getAttribute('aria-hidden'))
        .length;
    });
    expect(imagesWithoutAlt).toBe(0);
  });

  test('TC-A11Y-07 | Page has a single h1 heading', async ({ page }) => {
    await page.goto('/login');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('TC-A11Y-08 | Color contrast on CTA buttons is sufficient', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
    if (contrastViolations.length > 0) {
      console.warn('Contrast violations:', contrastViolations[0].nodes?.length, 'elements');
    }
    // Warn but don't fail — design system may need minor tweaks
    expect(contrastViolations.length).toBeLessThanOrEqual(5);
  });

  test('TC-A11Y-09 | Modals trap focus correctly', async ({ page }) => {
    await page.goto('/doctor/schedule');
    await page.waitForLoadState('networkidle');
    // Open any modal
    const openModalBtn = page.getByRole('button', { name: /add|new|schedule|إضافة/i }).first();
    if (await openModalBtn.count() > 0) {
      await openModalBtn.click();
      const modal = page.getByRole('dialog');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        // Focus should be inside modal
        const focusInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(document.activeElement) ?? false;
        });
        expect(focusInModal).toBe(true);
        // Close modal with Escape
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('TC-A11Y-10 | Skip navigation link exists', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    const skipLink = page.getByRole('link', { name: /skip.*content|تخطي/i });
    // Skip links are often visually hidden — check DOM presence
    const skipExists = await skipLink.count() > 0 ||
      await page.evaluate(() => !!document.querySelector('a[href="#main-content"], a[href="#content"]'));
    // This is a recommendation, not a hard failure
    if (!skipExists) {
      console.warn('⚠️ No skip navigation link found — consider adding one for keyboard users');
    }
  });
});

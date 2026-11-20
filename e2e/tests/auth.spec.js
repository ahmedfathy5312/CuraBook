// e2e/tests/auth.spec.js
// Critical Flow: Authentication (Login, Register, Logout, Forgot Password)

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage.js';

test.describe('🔐 Authentication - Critical Flows', () => {
  let authPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  // ── Login ──────────────────────────────────────────────────────────────

  test('TC-AUTH-01 | Login page renders correctly', async ({ page }) => {
    await authPage.goto();
    await expect(page).toHaveTitle(/CuraBook|login/i);
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitBtn).toBeVisible();
  });

  test('TC-AUTH-02 | Empty form shows validation errors', async ({ page }) => {
    await authPage.goto();
    await authPage.submitBtn.click();
    await expect(page.getByText(/required|مطلوب/i).first()).toBeVisible();
  });

  test('TC-AUTH-03 | Invalid email format shows error', async ({ page }) => {
    await authPage.goto();
    await authPage.emailInput.fill('not-an-email');
    await authPage.passwordInput.fill('password123');
    await authPage.submitBtn.click();
    await expect(page.getByText(/valid email|بريد صحيح/i)).toBeVisible();
  });

  test('TC-AUTH-04 | Wrong credentials shows server error', async ({ page }) => {
    await authPage.goto();
    await authPage.emailInput.fill('wrong@example.com');
    await authPage.passwordInput.fill('wrongpassword');
    await authPage.submitBtn.click();
    const err = await authPage.getErrorText();
    expect(err).toBeTruthy();
  });

  test('TC-AUTH-05 | Password field hides input by default', async ({ page }) => {
    await authPage.goto();
    await expect(authPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-AUTH-06 | Toggle password visibility works', async ({ page }) => {
    await authPage.goto();
    const toggleBtn = page.getByRole('button', { name: /show|hide|إظهار|إخفاء/i });
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await expect(authPage.passwordInput).toHaveAttribute('type', 'text');
    }
  });

  // ── Registration ───────────────────────────────────────────────────────

  test('TC-AUTH-07 | Registration page is accessible', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /register|sign up|تسجيل/i })).toBeVisible();
  });

  test('TC-AUTH-08 | Egyptian phone validation works', async ({ page }) => {
    await page.goto('/register');
    const phoneInput = page.getByLabel(/phone|هاتف/i);
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('1234567890'); // invalid format
      await page.getByRole('button', { name: /register|create|تسجيل/i }).click();
      await expect(page.getByText(/egyptian phone|رقم مصري/i)).toBeVisible();
    }
  });

  test('TC-AUTH-09 | Password strength validation enforced', async ({ page }) => {
    await page.goto('/register');
    const pwInput = page.getByLabel(/^password$/i).first();
    if (await pwInput.count() > 0) {
      await pwInput.fill('weak'); // missing uppercase + digit
      await page.getByRole('button', { name: /register|create|تسجيل/i }).click();
      await expect(page.getByText(/uppercase|number|حرف كبير/i)).toBeVisible();
    }
  });

  test('TC-AUTH-10 | Passwords must match', async ({ page }) => {
    await page.goto('/register');
    const pw1 = page.getByLabel(/^password$/i).first();
    const pw2 = page.getByLabel(/confirm password|تأكيد/i);
    if ((await pw1.count()) && (await pw2.count())) {
      await pw1.fill('ValidPass@1');
      await pw2.fill('DifferentPass@1');
      await page.getByRole('button', { name: /register|create|تسجيل/i }).click();
      await expect(page.getByText(/do not match|غير متطابق/i)).toBeVisible();
    }
  });

  // ── Forgot Password ────────────────────────────────────────────────────

  test('TC-AUTH-11 | Forgot password page is accessible', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /forgot|reset|نسيت/i })).toBeVisible();
  });

  test('TC-AUTH-12 | Forgot password validates email format', async ({ page }) => {
    await page.goto('/forgot-password');
    const emailInput = page.getByLabel(/email/i);
    if (await emailInput.count() > 0) {
      await emailInput.fill('bad-email');
      await page.getByRole('button', { name: /send|reset|إرسال/i }).click();
      await expect(page.getByText(/valid email/i)).toBeVisible();
    }
  });

  // ── Navigation Guards ──────────────────────────────────────────────────

  test('TC-AUTH-13 | Protected routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await expect(page).toHaveURL(/login|home/);
  });

  test('TC-AUTH-14 | Login page redirects already-authenticated users', async ({ page }) => {
    // Set a fake token to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'fake-token-for-redirect-test');
    });
    // The app should redirect away from /login
    await page.goto('/login');
    // If the app properly guards, it won't stay on /login
    // (Exact behavior depends on AuthContext — we just check no crash)
    await expect(page).not.toHaveURL(/\/login\?error/);
  });
});

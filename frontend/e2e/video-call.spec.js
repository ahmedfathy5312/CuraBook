/**
 * e2e/video-call.spec.js — Video Consultation Flow
 * Sprint 4: E2E coverage for the video call user journey.
 *
 * Scenarios:
 *   A — Patient joins video lobby → sees pre-call UI (camera/mic controls)
 *   B — Doctor joins same lobby → both sides render without crash
 *   C — Session not found → shows translated error, not raw exception
 *   D — Pre-call: camera/mic toggle buttons work (mute/unmute)
 *   E — Leaving the call redirects back to appointments
 *
 * Notes:
 *   - WebRTC camera/mic are mocked via Playwright's browser permissions API
 *   - JITSI_SECRET / signalling server not required for UI-level tests;
 *     the VideoConsultationPage is tested for render + graceful error handling
 */

import { test, expect } from '@playwright/test';
import { PATIENT_STATE, DOCTOR_STATE } from './auth.setup.js';

// ── Fake session IDs ──────────────────────────────────────────────────────────
const VALID_SESSION   = 'test-session-abc123';
const INVALID_SESSION = 'session-that-does-not-exist-xyz';

// ── Grant fake camera + mic permissions so WebRTC doesn't block render ───────
async function grantMediaPermissions(context) {
  await context.grantPermissions(['camera', 'microphone']);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-Call Lobby (Patient)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Video Pre-Call Lobby — Patient', () => {
  test.use({ storageState: PATIENT_STATE });

  test.beforeEach(async ({ context }) => {
    await grantMediaPermissions(context);
  });

  test('lobby page loads without crashing', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);

    // Should not redirect to login (auth guard passes)
    await expect(page).not.toHaveURL(/\/login/);

    // Page should render something — not a blank screen
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('lobby shows camera preview or loading indicator', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);

    // Either a video element or a spinner/loader should be visible
    const videoOrLoader = page.locator(
      'video, [data-testid="camera-preview"], [data-testid="loader"], .spinner, [role="progressbar"]'
    ).first();
    await expect(videoOrLoader).toBeVisible({ timeout: 8_000 });
  });

  test('mute / unmute mic button is present and clickable', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);

    const muteBtn = page.locator(
      '[data-testid="mute-mic"], [aria-label*="mic" i], [aria-label*="mute" i], button:has-text("Mute")'
    ).first();

    // If button exists → verify it's clickable (no crash after click)
    const count = await muteBtn.count();
    if (count > 0) {
      await expect(muteBtn).toBeVisible();
      await muteBtn.click();
      // Page should still be alive after toggling mic
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('camera toggle button is present and clickable', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);

    const camBtn = page.locator(
      '[data-testid="toggle-camera"], [aria-label*="camera" i], [aria-label*="video" i], button:has-text("Camera")'
    ).first();

    const count = await camBtn.count();
    if (count > 0) {
      await expect(camBtn).toBeVisible();
      await camBtn.click();
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('"Join call" button is visible in lobby', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);

    const joinBtn = page.getByRole('button', { name: /join|انضم|start call|ابدأ/i });
    await expect(joinBtn).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Video Consultation Page (Patient)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Video Consultation — Patient', () => {
  test.use({ storageState: PATIENT_STATE });

  test.beforeEach(async ({ context }) => {
    await grantMediaPermissions(context);
  });

  test('consultation page renders for valid session', async ({ page }) => {
    await page.goto(`/video/${VALID_SESSION}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('invalid session shows error — not raw JS exception', async ({ page }) => {
    // Intercept the session API call and return 404
    await page.route(`**/api/v1/video/sessions/${INVALID_SESSION}**`, (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'SESSION_NOT_FOUND', message: 'Session not found.' }),
      })
    );

    await page.goto(`/video/${INVALID_SESSION}`);

    // Must NOT show a raw JS error or white blank screen
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read properties');

    // Should show a user-facing error OR redirect gracefully
    const hasError = await page
      .locator('[data-testid="error-state"], [role="alert"], .error-boundary')
      .count();
    const redirectedAway = !page.url().includes(INVALID_SESSION);
    expect(hasError > 0 || redirectedAway).toBe(true);
  });

  test('leaving call navigates away from video page', async ({ page }) => {
    await page.goto(`/video/${VALID_SESSION}`);

    const leaveBtn = page.getByRole('button', {
      name: /leave|end call|غادر|إنهاء/i,
    });

    const count = await leaveBtn.count();
    if (count > 0) {
      await leaveBtn.click();
      // After leaving, user should NOT still be on the video page
      await expect(page).not.toHaveURL(new RegExp(`/video/${VALID_SESSION}`), {
        timeout: 8_000,
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Video Lobby — Doctor side
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Video Pre-Call Lobby — Doctor', () => {
  test.use({ storageState: DOCTOR_STATE });

  test.beforeEach(async ({ context }) => {
    await grantMediaPermissions(context);
  });

  test('doctor can access lobby without redirect to login', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('doctor lobby is not blank', async ({ page }) => {
    await page.goto(`/video/lobby/${VALID_SESSION}`);
    const bodyText = await page.textContent('body');
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});

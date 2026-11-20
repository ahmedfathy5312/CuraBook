/**
 * CuraBook — Playwright E2E Configuration
 * API-H10 FIX: Add E2E test suite for critical user journeys.
 *
 * Run:
 *   npx playwright test                    # all tests
 *   npx playwright test --headed           # with browser visible
 *   npx playwright test e2e/booking.spec   # single suite
 *   npx playwright show-report             # open HTML report
 *
 * CI:
 *   Runs in GitHub Actions via .github/workflows/ci.yml (e2e job).
 *   Uses --reporter=github for inline PR annotations.
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir:        './e2e',
  fullyParallel:  true,
  forbidOnly:     !!process.env.CI,
  retries:        process.env.CI ? 2 : 0,
  workers:        process.env.CI ? 2 : undefined,
  timeout:        30_000,
  expect:         { timeout: 5_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  use: {
    baseURL:           BASE_URL,
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    locale:            'en-US',
    timezoneId:        'Africa/Cairo',
    actionTimeout:     10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // ── Setup — creates auth state files ──────────────────────────────────
    {
      name:    'setup',
      testMatch: /.*\.setup\.js/,
    },

    // ── Chromium (primary) ────────────────────────────────────────────────
    {
      name:         'chromium',
      use:          { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // ── Firefox ───────────────────────────────────────────────────────────
    {
      name:         'firefox',
      use:          { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    // ── Mobile Chrome ─────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use:  { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],

  // Start dev server automatically when running locally
  webServer: process.env.CI ? undefined : {
    command:              'npm run dev',
    url:                  BASE_URL,
    reuseExistingServer:  !process.env.CI,
    timeout:              60_000,
  },
});

// playwright.config.js
// CuraBook E2E Test Configuration
// Run from project root: npx playwright test

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },

  projects: [
    // ── Auth setup — runs once, creates fixture JSON files ─────────────────
    {
      name:      'setup',
      testMatch: /auth\.setup\.js/,
    },

    // ── Desktop browsers ──────────────────────────────────────────────────
    {
      name:         'chromium',
      use:          { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name:         'firefox',
      use:          { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name:         'webkit',
      use:          { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // ── Mobile viewports ──────────────────────────────────────────────────
    {
      name:         'mobile-chrome',
      use:          { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name:         'mobile-safari',
      use:          { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },

    // ── RTL / Arabic locale ───────────────────────────────────────────────
    {
      name: 'rtl-arabic',
      use: {
        ...devices['Desktop Chrome'],
        locale:       'ar-EG',
        storageState: './e2e/fixtures/arabic-locale.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Runs from project root — starts Vite dev server inside ./frontend
  webServer: {
    command: 'npm run dev',
    cwd: './frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

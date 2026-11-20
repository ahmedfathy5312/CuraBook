// e2e/helpers/setup-auth.js
// Run once to create auth state fixtures used by tests
// Usage: node e2e/helpers/setup-auth.js

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '../fixtures');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function saveAuthState(email, password, filename) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await page.waitForURL(/dashboard|home/, { timeout: 15_000 });
    await context.storageState({ path: join(FIXTURES_DIR, filename) });
    console.log(`✅ Saved auth state: ${filename}`);
  } catch (err) {
    console.error(`❌ Could not login as ${email}:`, err.message);
    // Save empty state so tests don't crash
    writeFileSync(
      join(FIXTURES_DIR, filename),
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

async function createArabicLocaleFixture() {
  const fixture = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: 'i18nextLng', value: 'ar' },
          { name: 'language',   value: 'ar' },
        ],
      },
    ],
  };
  writeFileSync(join(FIXTURES_DIR, 'arabic-locale.json'), JSON.stringify(fixture, null, 2));
  console.log('✅ Saved Arabic locale fixture');
}

(async () => {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  await saveAuthState(
    process.env.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
    process.env.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    'doctor-auth.json',
  );

  await saveAuthState(
    process.env.TEST_PATIENT_EMAIL    || 'patient@curabook.test',
    process.env.TEST_PATIENT_PASSWORD || 'TestPat@123',
    'patient-auth.json',
  );

  await createArabicLocaleFixture();
  console.log('\n🎉 Auth fixtures ready. Run: npx playwright test');
})();

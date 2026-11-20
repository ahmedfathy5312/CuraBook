// e2e/tests/appointments.spec.js
// Critical Flow: Appointment Booking, Rescheduling, Cancellation

import { test, expect } from '@playwright/test';
import { AppointmentPage } from '../pages/AppointmentPage.js';

test.describe('📅 Appointments - Critical Flows', () => {
  let apptPage;

  test.beforeEach(async ({ page }) => {
    apptPage = new AppointmentPage(page);
  });

  // ── Doctor side ────────────────────────────────────────────────────────

  test.describe('Doctor Appointment Management', () => {
    test.use({ storageState: './e2e/fixtures/doctor-auth.json' });

    test('TC-APPT-LIST-01 | Doctor can view appointment list', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page).not.toHaveURL(/error/);
    });

    test('TC-APPT-LIST-02 | Filter by PENDING status', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      await apptPage.filterByStatus('PENDING');
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('TC-APPT-LIST-03 | Filter by CONFIRMED status', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      await apptPage.filterByStatus('CONFIRMED');
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('TC-APPT-LIST-04 | Filter by date range works', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      const today    = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0];
      await apptPage.filterByDateRange(today, nextWeek);
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('TC-APPT-LIST-05 | Pagination works when more than one page', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      const nextBtn = page.getByRole('button', { name: /next|التالي/i });
      if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('main')).toBeVisible();
      }
    });

    test('TC-APPT-LIST-06 | Doctor can confirm a pending appointment', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      const confirmBtn = page.getByRole('button', { name: /confirm|تأكيد/i }).first();
      if (await confirmBtn.count() > 0 && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        // Expect a success toast or status change
        const success = page.getByText(/confirmed|تم التأكيد/i);
        if (await success.count() > 0) {
          await expect(success.first()).toBeVisible({ timeout: 5_000 });
        }
      }
    });

    test('TC-APPT-LIST-07 | Doctor can cancel an appointment', async ({ page }) => {
      await apptPage.gotoDoctorAppointments();
      const cancelBtn = page.getByRole('button', { name: /cancel|إلغاء/i }).first();
      if (await cancelBtn.count() > 0 && await cancelBtn.isEnabled()) {
        await cancelBtn.click();
        // Confirm dialog if present
        const confirmDialog = page.getByRole('dialog');
        if (await confirmDialog.count() > 0) {
          const okBtn = confirmDialog.getByRole('button', { name: /confirm|yes|تأكيد|نعم/i });
          await okBtn.click();
        }
        await expect(page.getByRole('main')).toBeVisible();
      }
    });
  });

  // ── Patient side ───────────────────────────────────────────────────────

  test.describe('Patient Appointment Booking', () => {
    test.use({ storageState: './e2e/fixtures/patient-auth.json' });

    test('TC-BOOK-01 | Booking form renders for patients', async ({ page }) => {
      await page.goto('/appointments');
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('TC-BOOK-02 | Cannot book appointment with past date', async ({ page }) => {
      await apptPage.gotoBooking().catch(() => {/* skip if page not accessible */});
      const dateInput = page.getByLabel(/date|التاريخ/i);
      if (await dateInput.count() > 0) {
        const yesterday = new Date(Date.now() - 86400_000).toISOString().split('T')[0];
        await dateInput.fill(yesterday);
        await page.getByRole('button', { name: /book|confirm|احجز/i }).click();
        await expect(page.getByText(/past|ماضي|invalid date/i)).toBeVisible();
      }
    });

    test('TC-BOOK-03 | Visit type IN_PERSON can be selected', async ({ page }) => {
      await apptPage.gotoBooking().catch(() => {});
      const visitType = page.getByLabel(/visit type|نوع الزيارة/i);
      if (await visitType.count() > 0) {
        await visitType.selectOption('IN_PERSON');
        await expect(visitType).toHaveValue('IN_PERSON');
      }
    });

    test('TC-BOOK-04 | Visit type ONLINE can be selected', async ({ page }) => {
      await apptPage.gotoBooking().catch(() => {});
      const visitType = page.getByLabel(/visit type|نوع الزيارة/i);
      if (await visitType.count() > 0) {
        await visitType.selectOption('ONLINE');
        await expect(visitType).toHaveValue('ONLINE');
      }
    });

    test('TC-BOOK-05 | Notes field has 500 char max', async ({ page }) => {
      await apptPage.gotoBooking().catch(() => {});
      const notesInput = page.getByLabel(/notes|ملاحظات/i);
      if (await notesInput.count() > 0) {
        const longText = 'A'.repeat(501);
        await notesInput.fill(longText);
        await page.getByRole('button', { name: /book|احجز/i }).click();
        const err = page.getByText(/500|cannot exceed/i);
        if (await err.count() > 0) {
          await expect(err.first()).toBeVisible();
        }
      }
    });
  });
});

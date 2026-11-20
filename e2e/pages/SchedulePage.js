// e2e/pages/SchedulePage.js
// Page Object Model for Doctor Schedule Management

export class SchedulePage {
  constructor(page) {
    this.page = page;

    // Schedule calendar/grid
    this.scheduleGrid    = page.getByTestId('schedule-grid');
    this.addSlotBtn      = page.getByRole('button', { name: /add slot|add availability|إضافة موعد/i });
    this.timeSlots       = page.getByTestId('time-slot');

    // Add/Edit slot modal
    this.slotModal       = page.getByRole('dialog');
    this.daySelect       = page.getByLabel(/day|اليوم/i);
    this.startTimeInput  = page.getByLabel(/start time|وقت البدء/i);
    this.endTimeInput    = page.getByLabel(/end time|وقت الانتهاء/i);
    this.locationSelect  = page.getByLabel(/location|الموقع/i);
    this.saveSlotBtn     = page.getByRole('button', { name: /save|حفظ/i });
    this.deleteSlotBtn   = page.getByRole('button', { name: /delete|حذف/i });

    // Locations
    this.locationBadges  = page.getByTestId('location-badge');
  }

  async goto() {
    await this.page.goto('/doctor/schedule');
    await this.page.waitForLoadState('networkidle');
  }

  async openAddSlotModal() {
    if (await this.addSlotBtn.count() > 0) {
      await this.addSlotBtn.click();
      await this.slotModal.waitFor({ timeout: 5_000 });
    }
  }

  async closeModal() {
    const closeBtn = this.page.getByRole('button', { name: /close|×|إغلاق/i }).first();
    if (await closeBtn.count() > 0) await closeBtn.click();
  }

  async getSlotCount() {
    return this.timeSlots.count();
  }
}

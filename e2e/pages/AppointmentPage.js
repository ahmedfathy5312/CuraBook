// e2e/pages/AppointmentPage.js
// Page Object Model for Appointment Booking & Management

export class AppointmentPage {
  constructor(page) {
    this.page = page;

    // Booking form
    this.doctorSelect    = page.getByLabel(/doctor|الطبيب/i);
    this.dateInput       = page.getByLabel(/date|التاريخ/i);
    this.timeSlotGroup   = page.getByRole('radiogroup', { name: /time slot|وقت/i });
    this.visitTypeSelect = page.getByLabel(/visit type|نوع الزيارة/i);
    this.notesInput      = page.getByLabel(/notes|ملاحظات/i);
    this.bookBtn         = page.getByRole('button', { name: /book|احجز/i });

    // Appointment list
    this.appointmentRows = page.getByRole('row').filter({ hasText: /in.person|online|حضوري|عبر الإنترنت/i });
    this.statusFilter    = page.getByRole('combobox', { name: /status|الحالة/i });
    this.dateRangeFrom   = page.getByLabel(/from|من/i);
    this.dateRangeTo     = page.getByLabel(/to|إلى/i);
    this.searchInput     = page.getByPlaceholder(/search|بحث/i);

    // Actions
    this.cancelBtn    = page.getByRole('button', { name: /cancel|إلغاء/i });
    this.rescheduleBtn = page.getByRole('button', { name: /reschedule|إعادة جدولة/i });
    this.confirmBtn   = page.getByRole('button', { name: /confirm|تأكيد/i });
  }

  async gotoBooking() {
    await this.page.goto('/appointments/book');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoDoctorAppointments() {
    await this.page.goto('/doctor/appointments');
    await this.page.waitForLoadState('networkidle');
  }

  async bookAppointment({ doctor, date, visitType = 'IN_PERSON', notes = '' }) {
    await this.gotoBooking();
    if (doctor) await this.doctorSelect.selectOption({ label: doctor });
    if (date)   await this.dateInput.fill(date);

    // Pick first available slot
    const firstSlot = this.timeSlotGroup.getByRole('radio').first();
    await firstSlot.check();

    await this.visitTypeSelect.selectOption(visitType);
    if (notes) await this.notesInput.fill(notes);
    await this.bookBtn.click();
  }

  async filterByStatus(status) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDateRange(from, to) {
    await this.dateRangeFrom.fill(from);
    await this.dateRangeTo.fill(to);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }
}

// e2e/pages/PatientRecordPage.js
// Page Object Model for Patient Records & Medical History

export class PatientRecordPage {
  constructor(page) {
    this.page = page;

    // Patient list
    this.searchInput     = page.getByPlaceholder(/search|بحث/i);
    this.selectAllCheck  = page.getByRole('checkbox', { name: /select all|تحديد الكل/i });
    this.bulkActionBar   = page.getByTestId('bulk-action-bar');
    this.patientRows     = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });

    // Patient record detail
    this.appointmentsTab  = page.getByRole('tab', { name: /appointments|مواعيد/i });
    this.historyTab       = page.getByRole('tab', { name: /history|timeline|سجل/i });
    this.recordsTab       = page.getByRole('tab', { name: /records|سجلات/i });

    // Medical record form
    this.addRecordBtn     = page.getByRole('button', { name: /add record|إضافة سجل/i });
    this.chiefComplaint   = page.getByLabel(/chief complaint|الشكوى/i);
    this.diagnosis        = page.getByLabel(/diagnosis|التشخيص/i);
    this.treatmentPlan    = page.getByLabel(/treatment|العلاج/i);
    this.saveRecordBtn    = page.getByRole('button', { name: /save|حفظ/i });
    this.cancelRecordBtn  = page.getByRole('button', { name: /cancel|إلغاء/i });

    // Timeline
    this.timelineItems    = page.getByTestId('timeline-item');
    this.timelineConnector = page.getByTestId('timeline-connector');
  }

  async gotoPatientList() {
    await this.page.goto('/doctor/patients');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoPatientRecord(patientId = 1) {
    await this.page.goto(`/doctor/patients/${patientId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async gotoNewRecord() {
    await this.page.goto('/doctor/patients/new');
    await this.page.waitForLoadState('networkidle');
  }

  async searchPatients(query) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(400); // debounce
  }

  async openHistoryTab() {
    if (await this.historyTab.count() > 0) {
      await this.historyTab.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async openAddRecordModal() {
    if (await this.addRecordBtn.count() > 0) {
      await this.addRecordBtn.click();
      await this.page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    }
  }

  async fillAndSaveRecord({ complaint = 'Headache', diagnosis = 'Migraine', treatment = 'Rest' } = {}) {
    await this.openAddRecordModal();
    if (await this.chiefComplaint.count() > 0) await this.chiefComplaint.fill(complaint);
    if (await this.diagnosis.count() > 0)      await this.diagnosis.fill(diagnosis);
    if (await this.treatmentPlan.count() > 0)  await this.treatmentPlan.fill(treatment);
    await this.saveRecordBtn.click();
  }

  async getTimelineItemCount() {
    return this.timelineItems.count();
  }
}

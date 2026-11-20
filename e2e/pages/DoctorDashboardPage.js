// e2e/pages/DoctorDashboardPage.js
// Page Object Model for Doctor Dashboard

export class DoctorDashboardPage {
  constructor(page) {
    this.page = page;

    // Nav
    this.navDashboard     = page.getByRole('link', { name: /dashboard|الرئيسية/i });
    this.navAppointments  = page.getByRole('link', { name: /appointments|مواعيد/i });
    this.navPatients      = page.getByRole('link', { name: /patients|مرضى/i });
    this.navAnalytics     = page.getByRole('link', { name: /analytics|تحليلات/i });
    this.navPrescriptions = page.getByRole('link', { name: /prescriptions|وصفات/i });
    this.navSchedule      = page.getByRole('link', { name: /schedule|جدول/i });
    this.navNotifications = page.getByRole('link', { name: /notifications|إشعارات/i });
    this.navProfile       = page.getByRole('link', { name: /profile|الملف/i });

    // Dashboard content
    this.welcomeBanner   = page.getByTestId('welcome-banner');
    this.kpiCards        = page.getByTestId('kpi-card');
    this.appointmentList = page.getByTestId('appointment-list');
  }

  async goto() {
    await this.page.goto('/doctor/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateTo(section) {
    const map = {
      appointments:  this.navAppointments,
      patients:      this.navPatients,
      analytics:     this.navAnalytics,
      prescriptions: this.navPrescriptions,
      schedule:      this.navSchedule,
      notifications: this.navNotifications,
      profile:       this.navProfile,
    };
    await map[section].click();
    await this.page.waitForLoadState('networkidle');
  }

  async getWelcomeText() {
    return this.welcomeBanner.textContent();
  }

  async getKpiCount() {
    return this.kpiCards.count();
  }
}

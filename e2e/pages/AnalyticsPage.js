// e2e/pages/AnalyticsPage.js
// Page Object Model for Doctor Analytics

export class AnalyticsPage {
  constructor(page) {
    this.page = page;

    // Range selector
    this.rangeButtons = page.getByRole('button', { name: /week|month|3 months|year|أسبوع|شهر|سنة/i });
    this.weekBtn      = page.getByRole('button', { name: /^week$|^أسبوع$/i });
    this.monthBtn     = page.getByRole('button', { name: /^month$|^شهر$/i });
    this.yearBtn      = page.getByRole('button', { name: /^year$|^سنة$/i });

    // KPI cards
    this.kpiCards          = page.getByTestId('kpi-card');
    this.totalPatientsCard  = page.getByTestId('kpi-total-patients');
    this.appointmentsCard   = page.getByTestId('kpi-appointments');
    this.revenueCard        = page.getByTestId('kpi-revenue');

    // Charts
    this.appointmentChart   = page.getByTestId('appointment-chart');
    this.revenueChart       = page.getByTestId('revenue-chart');
    this.sparklines         = page.getByTestId('sparkline');

    // Top patients table
    this.topPatientsTable   = page.getByTestId('top-patients');
    this.topPatientRows     = page.getByTestId('top-patient-row');

    // Comparison delta badges
    this.deltaUp   = page.getByTestId('delta-up');
    this.deltaDown = page.getByTestId('delta-down');
  }

  async goto() {
    await this.page.goto('/doctor/analytics');
    await this.page.waitForLoadState('networkidle');
  }

  async selectRange(range) {
    // range: 'week' | 'month' | '3months' | 'year'
    const btn = this.page.getByRole('button', { name: new RegExp(range, 'i') });
    if (await btn.count() > 0) {
      await btn.first().click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async getKpiCount() {
    return this.kpiCards.count();
  }

  async isChartVisible(chartName) {
    const chart = this.page.getByTestId(chartName).or(
      this.page.locator('.recharts-wrapper').first()
    );
    return chart.count().then(n => n > 0);
  }
}

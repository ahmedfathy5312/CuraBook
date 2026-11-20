// e2e/pages/AuthPage.js
// Page Object Model for authentication flows

export class AuthPage {
  constructor(page) {
    this.page = page;

    // Locators
    this.emailInput    = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitBtn     = page.getByRole('button', { name: /sign in|login|دخول/i });
    this.errorMsg      = page.getByRole('alert');
    this.logoutBtn     = page.getByRole('button', { name: /logout|sign out|خروج/i });
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(email, password) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
    await this.page.waitForURL(/dashboard|home/, { timeout: 10_000 });
  }

  async loginAsDoctor() {
    await this.login(
      process.env.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
      process.env.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    );
  }

  async loginAsPatient() {
    await this.login(
      process.env.TEST_PATIENT_EMAIL    || 'patient@curabook.test',
      process.env.TEST_PATIENT_PASSWORD || 'TestPat@123',
    );
  }

  async logout() {
    await this.logoutBtn.click();
    await this.page.waitForURL(/login|home/);
  }

  async getErrorText() {
    await this.errorMsg.waitFor({ timeout: 5_000 });
    return this.errorMsg.textContent();
  }
}

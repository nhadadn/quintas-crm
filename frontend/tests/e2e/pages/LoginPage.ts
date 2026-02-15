import { type Locator, type Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/Email/i);
    this.passwordInput = page.getByLabel(/Contraseña/i);
    this.loginButton = page.getByRole('button', { name: /Iniciar Sesión/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /¿Olvidaste tu contraseña?/i });
    // Exclude Next.js route announcer
    this.errorMessage = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
  }

  async goto() {
    await this.page.goto('/portal/auth/login');
  }

  async login(email: string, password: string) {
    console.log(`[LoginPage] Attempting login for ${email}`);
    // Use robust typing for WebKit compatibility
    await this.emailInput.click();
    await this.page.keyboard.type(email, { delay: 50 });

    await this.passwordInput.click();
    await this.page.keyboard.type(password, { delay: 50 });

    // Ensure button is ready
    await this.loginButton.waitFor({ state: 'visible' });
    if (!(await this.loginButton.isEnabled())) {
      console.log('[LoginPage] WARNING: Login button is disabled!');
    }

    // Setup listener for auth response
    const authResponsePromise = this.page
      .waitForResponse(
        (response) =>
          response.url().includes('/api/auth/callback/credentials') &&
          response.request().method() === 'POST',
        { timeout: 10000 },
      )
      .catch(() => null);

    console.log('[LoginPage] Clicking login button');
    // Try pressing Enter on password field first as it's more robust
    // await this.passwordInput.press('Enter');
    await this.loginButton.click();

    // Check auth response
    const authResponse = await authResponsePromise;
    if (authResponse) {
      console.log(`[LoginPage] Auth response status: ${authResponse.status()}`);
      try {
        const body = await authResponse.text();
        console.log(`[LoginPage] Auth response body: ${body.substring(0, 200)}...`);
      } catch (e) {
        console.log('[LoginPage] Could not read auth response body');
      }
    } else {
      console.log('[LoginPage] No auth response received within 10s');
    }

    console.log('[LoginPage] Waiting for navigation to /portal');
    try {
      // Use strict regex to avoid matching /portal/auth/login
      // Match exactly /portal or /portal/
      await this.page.waitForURL(/\/portal\/?$/, { timeout: 15000 });
    } catch (error) {
      console.log(`[LoginPage] Navigation timeout! Current URL: ${this.page.url()}`);

      // Check for specific error messages
      const alert = this.errorMessage;
      if (await alert.isVisible()) {
        console.log(`[LoginPage] Alert found (text): "${await alert.innerText()}"`);
        console.log(`[LoginPage] Alert found (html): "${await alert.innerHTML()}"`);
      }

      // Check for validation errors on inputs
      const emailError = this.page.locator('#email-error');
      if (await emailError.isVisible())
        console.log(`[LoginPage] Email error: ${await emailError.innerText()}`);

      throw error;
    }
  }

  async navigateToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}

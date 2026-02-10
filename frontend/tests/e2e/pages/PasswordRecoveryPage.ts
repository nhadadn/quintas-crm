import { type Locator, type Page, expect } from '@playwright/test';

export class PasswordRecoveryPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly sendButton: Locator;
  readonly successMessage: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly updatePasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/Email registrado/i);
    this.sendButton = page.getByRole('button', { name: /Enviar enlace/i });
    this.successMessage = page.locator('.bg-green-50'); // Selector basado en clase de éxito
    
    // Para la segunda parte del flujo (reset)
    this.newPasswordInput = page.getByLabel(/Nueva contraseña/i);
    this.confirmPasswordInput = page.getByLabel(/Confirmar contraseña/i);
    this.updatePasswordButton = page.getByRole('button', { name: /Actualizar contraseña/i });
  }

  async goto() {
    await this.page.goto('/portal/auth/forgot-password');
  }

  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async resetPassword(password: string) {
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.updatePasswordButton.click();
  }
}

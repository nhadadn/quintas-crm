import { type Locator, type Page, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel(/Nombre/i);
    this.phoneInput = page.getByLabel(/Teléfono/i);
    this.saveButton = page.getByRole('button', { name: /Guardar/i });
    this.successMessage = page.getByText(/actualizado correctamente/i);
  }

  async goto() {
    await this.page.goto('/portal/perfil');
  }

  async updateProfile(name: string, phone: string) {
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.saveButton.click();
  }
}

import { type Locator, type Page, expect } from '@playwright/test';

export class PaymentPage {
  readonly page: Page;
  readonly payButton: Locator;
  readonly confirmButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.payButton = page.getByRole('button', { name: /Pagar/i }).first();
    this.confirmButton = page.getByRole('button', { name: 'Confirmar' });
    this.successMessage = page.getByText('¡Pago Exitoso!');
    this.errorMessage = page.getByText(/Error|Rechazada/i);
  }

  async goto() {
    await this.page.goto('/portal/pagos');
  }

  async initiatePayment() {
    await this.payButton.click();
  }

  async fillStripeForm(cardNumber: string, expiry: string, cvc: string, zip: string) {
    const cardFrame = this.page.frameLocator('iframe[title*="Secure card payment"]');
    await cardFrame.getByPlaceholder('Card number').fill(cardNumber);
    await cardFrame.getByPlaceholder('MM / YY').fill(expiry);
    await cardFrame.getByPlaceholder('CVC').fill(cvc);
    await cardFrame.getByPlaceholder('ZIP').fill(zip);
  }

  async confirmPayment() {
    // Click en pagar dentro del formulario si es necesario, o el botón global
    await this.page.getByRole('button', { name: /Pagar/i }).click();
    
    // Confirmar en modal si existe
    if (await this.confirmButton.isVisible()) {
      await this.confirmButton.click();
    }
  }

  async filterByStatus(status: string) {
    // Implementar filtro
  }
}

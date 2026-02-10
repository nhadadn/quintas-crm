import { type Locator, type Page, expect } from '@playwright/test';

export class PortalPage {
  readonly page: Page;
  readonly logoutButton: Locator;
  readonly userName: Locator;

  constructor(page: Page) {
    this.page = page;
    // Ajustar selectores según la implementación real del Navbar/Sidebar
    this.logoutButton = page.getByRole('button', { name: 'Cerrar Sesión' });
    this.userName = page.locator('.text-right.font-medium.text-white'); 
  }

  async goto() {
    await this.page.goto('/portal');
  }

  async logout() {
    // Intentar abrir menú móvil si es visible
    const mobileMenuButton = this.page.getByRole('button', { name: 'Abrir menú' });
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // Pequeña pausa para animación
      await this.page.waitForTimeout(500);
    }
    
    // Buscar cualquier botón de cerrar sesión y forzar click
    // Esto maneja tanto el botón de escritorio como el de móvil
    const logoutBtn = this.page.locator('button').filter({ hasText: 'Cerrar Sesión' }).first();
    await logoutBtn.click({ force: true });
  }
}

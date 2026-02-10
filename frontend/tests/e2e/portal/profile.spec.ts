import { test, expect } from '../fixtures';

test.describe('Perfil de Usuario', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    await expect(page).toHaveURL(/\/portal/);
  });

  // TODO: Implementar página de perfil en el frontend
  test.skip('Editar Perfil', async ({ profilePage }) => {
    await profilePage.goto();
    await profilePage.updateProfile('Cliente Prueba Actualizado', '5559876543');
    await expect(profilePage.successMessage).toBeVisible();
    
    // Validar persistencia
    await profilePage.page.reload();
    await expect(profilePage.nameInput).toHaveValue('Cliente Prueba Actualizado');
  });
});

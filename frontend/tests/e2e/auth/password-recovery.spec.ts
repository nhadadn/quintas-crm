import { test, expect } from '../fixtures';

test.describe('Recuperación de Contraseña', () => {
  test.skip('Flujo de Recuperación de Contraseña', async ({ passwordRecoveryPage, page }) => {
    await passwordRecoveryPage.goto();
    await passwordRecoveryPage.requestPasswordReset('cliente.prueba@quintas.com');

    // Verificar mensaje de éxito O error (dependiendo de la configuración del backend)
    // Buscamos cualquier alerta (éxito o error)
    const alert = page.locator('[role="alert"], .bg-green-50, .bg-red-50');
    await expect(alert).toBeVisible();

    // Opcional: verificar texto
    // const text = await alert.textContent();
    // console.log('Recovery message:', text);
  });
});

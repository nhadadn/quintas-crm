import { test, expect } from '../fixtures';

test.describe('Flujo de Login', () => {
  test('Login Exitoso', async ({ loginPage, portalPage, page }) => {
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    
    // Validar redirección a portal (puede ser /portal o /portal/dashboard)
    await expect(page).toHaveURL(/\/portal/);
    
    // Validar nombre de usuario (si está implementado en la página)
    // await expect(portalPage.userName).toBeVisible();
  });

  test('Login Fallido', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'WrongPass123!');
    
    // Esperar un poco más por la respuesta del servidor
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10000 });
    // Verificar que seguimos en la página de login (o al menos no en el dashboard)
    // La URL contiene /portal/auth/login, que matchea /portal/, por eso fallaba antes
    // Usamos regex más estricta para el dashboard
    await expect(page).not.toHaveURL(/\/portal\/?$/);
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test.skip('Logout', async ({ loginPage, portalPage, page }) => {
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    await expect(page).toHaveURL(/\/portal/);
    
    await portalPage.logout();
    await expect(page).toHaveURL(/\/portal\/auth\/login/);
    
    // Validar middleware
    await portalPage.goto();
    await expect(page).toHaveURL(/\/portal\/auth\/login/);
  });
});

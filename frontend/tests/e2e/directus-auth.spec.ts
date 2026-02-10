import { test, expect } from '@playwright/test';

test.describe('Directus Auth & Error Handling', () => {
  test('Should handle 403 Forbidden gracefully with retry and notification', async ({ page }) => {
    // Mock 403 response for fetching clients
    let requestCount = 0;

    await page.route('**/items/clientes*', async (route) => {
      requestCount++;
      console.log(`Intercepted request #${requestCount}`);

      // Return 403 Forbidden
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              message: "You don't have permission to access this.",
              extensions: {
                code: 'FORBIDDEN',
              },
            },
          ],
        }),
      });
    });

    // Navigate to clients page
    await page.goto('http://localhost:3000/clientes');

    // Verify that the UI shows an error message
    // We expect the page to handle the error and show a user-friendly message
    // This might fail initially until we implement the fix
    await expect(
      page.getByText(/No tienes permisos|Acceso denegado|Error de autorización/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Should handle 401 Unauthorized', async ({ page }) => {
    // Listen to console logs
    page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));

    await page.route('**/items/clientes*', async (route) => {
      console.log('Intercepted 401 request');
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }],
        }),
      });
    });

    await page.goto('http://localhost:3000/clientes');

    // Wait for the error to appear
    await expect(page.getByText(/Sesión no válida/i)).toBeVisible();
  });

  test('Should load clients successfully (200 OK)', async ({ page }) => {
    // Mock success response
    await page.route('**/items/clientes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, nombre: 'Juan', apellido_paterno: 'Perez', email: 'juan@example.com' },
            { id: 2, nombre: 'Maria', apellido_paterno: 'Lopez', email: 'maria@example.com' },
          ],
          meta: { total: 2 },
        }),
      });
    });

    await page.goto('http://localhost:3000/clientes');

    // Verify data is displayed
    await expect(page.getByText('Juan Perez')).toBeVisible();
    await expect(page.getByText('Maria Lopez')).toBeVisible();
    // Verify no error message
    await expect(page.getByText(/Error/i)).not.toBeVisible();
  });
});

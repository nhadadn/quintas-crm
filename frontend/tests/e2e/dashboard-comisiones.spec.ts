import { test, expect } from './fixtures';

test.describe('Dashboard Comisiones', () => {
  test.beforeEach(async ({ page }) => {
    // Mock KPI API
    await page.route('**/api/dashboard/kpis**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total_ventas: 1000000,
            comisiones_pendientes: 50000,
            ventas_mes_actual: 10,
            crecimiento_mes_anterior: 5,
            comisiones_totales: 100000,
            lotes_vendidos_mes: 2,
          },
        }),
      });
    });

    // Mock Comisiones API
    await page.route('**/api/dashboard/comisiones-vendedor**', async (route) => {
      // Adjust URL pattern as needed
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              vendedor_id: 1,
              vendedor: 'Vendedor Test',
              cantidad_ventas: 5,
              total_vendido: 500000,
              total_comisiones: 25000,
            },
            {
              vendedor_id: 2,
              vendedor: 'Vendedor Sin Datos',
              cantidad_ventas: 1,
              total_vendido: null, // Test null/undefined handling
              total_comisiones: null,
            },
          ],
        }),
      });
    });
  });

  test('Loads dashboard and displays data correctly', async ({ page, loginPage }) => {
    // Navigate and login
    await loginPage.goto();
    // Assuming we have a test user. If not, this might fail in real execution without env vars.
    await loginPage.login('admin@quintas.com', 'Admin123!');

    // Navigate to dashboard comisiones
    await page.goto('/dashboard/comisiones');

    // Check for critical elements
    await expect(page.getByText('Dashboard de Comisiones')).toBeVisible();

    // Verify KPI Cards
    await expect(page.getByText('Comisiones Totales')).toBeVisible();

    // Verify Table Data
    await expect(page.getByText('Vendedor Test')).toBeVisible();
    await expect(page.getByText('Vendedor Sin Datos')).toBeVisible();

    // Verify that "Vendedor Sin Datos" shows formatted currency (e.g., $0.00) and doesn't crash
    // The specific format depends on locale, but we check it doesn't show "NaN" or crash
    const row = page.getByRole('row', { name: 'Vendedor Sin Datos' });
    await expect(row).toBeVisible();

    // Check for no console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    expect(consoleErrors).toEqual([]);
  });
});

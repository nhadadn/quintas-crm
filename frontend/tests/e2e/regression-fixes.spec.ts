import { test, expect } from '@playwright/test';

test.describe('Fix Verifications', () => {
  test('Venta Page handles null venta_id in pagos without crashing', async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Mock Pagos API
    await page.route('**/items/pagos*', async (route) => {
      console.log('Intercepted pagos request');
      await route.fulfill({
        json: {
          data: [
            {
              id: 999,
              monto: 5000,
              fecha_pago: '2024-01-01',
              venta_id: null, // The problematic case
              estatus: 'pagado',
            },
          ],
        },
      });
    });

    // Mock Venta API
    await page.route('**/items/ventas/123*', async (route) => {
      console.log('Intercepted venta request');
      await route.fulfill({
        json: {
          data: {
            id: 123,
            fecha_venta: '2024-01-01',
            estatus: 'vendido',
            precio_venta: 100000,
            enganche: 10000,
          },
        },
      });
    });

    // Navigate to the page
    await page.goto('http://localhost:3000/ventas/123');

    // Wait for loading to finish (either success or error)
    await page.waitForLoadState('networkidle');

    // Verify the page loaded and shows the title (meaning no crash)
    await expect(page.locator('h1')).toContainText('Venta #123');
  });
});

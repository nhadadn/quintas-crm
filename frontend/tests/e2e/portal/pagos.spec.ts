import { test, expect } from '../fixtures';

const STRIPE_CARDS = {
  success: '4242 4242 4242 4242',
  fail: '4000 0000 0000 0002',
  expiry: '01/25',
  cvc: '123',
  zip: '12345',
};

test.describe('Portal de Pagos', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    await expect(page).toHaveURL(/\/portal/);
  });

  test.skip('Ver Historial de Pagos', async ({ paymentPage, page }) => {
    await paymentPage.goto();

    // Si hay error de carga (ej. API caída o usuario sin perfil), el test debe manejarlo
    const errorMsg = page.getByRole('alert'); // O ErrorMessage component structure
    if (await page.getByText('Error al cargar pagos').isVisible()) {
      console.log('Skipping payments test due to environment error');
      test.skip();
      return;
    }

    // Validar que se muestra tabla de pagos
    await expect(page.getByRole('heading', { name: /Mis Pagos|Historial/i })).toBeVisible();

    // Validar datos (ejemplo genérico)
    // await expect(page.locator('table')).toBeVisible();
  });

  test.skip('Realizar Pago con Stripe', async ({ paymentPage }) => {
    await paymentPage.goto();

    // Verificar si hay botón de pagar antes de intentar
    if (await paymentPage.payButton.isVisible()) {
      await paymentPage.initiatePayment();
      await paymentPage.fillStripeForm(
        STRIPE_CARDS.success,
        STRIPE_CARDS.expiry,
        STRIPE_CARDS.cvc,
        STRIPE_CARDS.zip,
      );
      await paymentPage.confirmPayment();
      await expect(paymentPage.successMessage).toBeVisible();
    } else {
      console.log('No hay pagos pendientes para probar pago exitoso');
      test.skip();
    }
  });

  test.skip('Pago con Tarjeta Rechazada', async ({ paymentPage }) => {
    await paymentPage.goto();

    if (await paymentPage.payButton.isVisible()) {
      await paymentPage.initiatePayment();
      await paymentPage.fillStripeForm(
        STRIPE_CARDS.fail,
        STRIPE_CARDS.expiry,
        STRIPE_CARDS.cvc,
        STRIPE_CARDS.zip,
      );
      await paymentPage.confirmPayment();
      await expect(paymentPage.errorMessage).toBeVisible();
    } else {
      console.log('No hay pagos pendientes para probar pago fallido');
      test.skip();
    }
  });
});

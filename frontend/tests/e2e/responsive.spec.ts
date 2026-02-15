import { test, expect } from './fixtures';

test.describe('Responsive Design', () => {
  test.beforeEach(({ page }) => {
    // Capture browser console logs
    page.on('console', (msg) => {
      // Log everything for debugging
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      console.log(`[BROWSER UNCAUGHT ERROR] ${err.message}`);
    });
  });

  test('Test 1: Mobile View (iPhone)', async ({ page, loginPage }) => {
    // 1. Configurar viewport para iPhone 12/13/14 (390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    // 2. Navegar a /portal (requiere login)
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');

    // Esperar redirección explícita fuera de login
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/portal/, { timeout: 10000 });

    // Esperar a que el contenido principal cargue
    await page.waitForLoadState('networkidle');

    // 3. Validar que layout se ajusta a móvil
    // Verificar que el menú de escritorio está oculto
    const desktopMenu = page.locator('.hidden.md\\:flex'); // Clases de Tailwind comunes para ocultar en móvil
    // O verificar por texto de menú visible en desktop
    await expect(desktopMenu.first()).toBeHidden();

    // 4. Validar que menú es responsive (hamburger menu)
    // Buscar el botón del menú móvil
    // En PortalPage.ts se usa: getByRole('button', { name: 'Abrir menú' })
    // Si no tiene aria-label, buscamos por el SVG o clase
    const mobileMenuButton = page.locator('button:has(svg)');
    // Un selector más específico si es posible, pero 'button' en el nav bar debería ser el del menú
    // Asumimos que es visible en móvil
    // await expect(mobileMenuButton.first()).toBeVisible();

    // 30. Nota: El prompt dice "Validar que menú es responsive".
    // Verificamos que existe el botón de menú
    // Usamos un selector por atributo aria-controls que es estable según el código
    const menuButton = page.locator('button[aria-controls="mobile-menu"]');

    // Debug: Imprimir URL y si el botón es visible
    console.log(`Current URL: ${page.url()}`);
    if (!(await menuButton.isVisible())) {
      console.log('Mobile menu button not visible.');
    }

    await expect(menuButton).toBeVisible();

    // 5. Validar que tabla de pagos (Dashboard) se muestra como tarjetas en móvil
    // En mobile, TablaAmortizacion usa una vista de tarjetas (hidden md:block para tabla, md:hidden para tarjetas)

    // Navegamos al dashboard si no estamos ahí
    if (!page.url().endsWith('/portal')) {
      await page.goto('/portal');
    }

    // Buscar el contenedor de las tarjetas
    const mobileCardsContainer = page.locator('.md\\:hidden.space-y-4').first();

    // Debug logic for failure analysis
    if (!(await mobileCardsContainer.isVisible())) {
      console.log('Mobile cards container not visible.');

      // Check for error message
      const errorMsg = page.locator('text=Error al cargar perfil');
      if (await errorMsg.isVisible()) {
        console.log('ERROR DETECTED: "Error al cargar perfil" is visible.');
        const errorDetails = await page.locator('.text-red-600, .text-red-500').allInnerTexts();
        console.log('Error details:', errorDetails);
      }

      // Check for "No data" message
      const noDataMsg = page.locator('text=No hay información de pagos disponible');
      if (await noDataMsg.isVisible()) {
        console.log('WARNING: "No hay información de pagos disponible" is visible.');
      }

      // Check if desktop table is visible instead
      const desktopTable = page.locator('.hidden.md\\:block').first();
      if (await desktopTable.isVisible()) {
        console.log('Desktop table IS visible on mobile (Unexpected!)');
      }
    }

    await expect(mobileCardsContainer).toBeVisible();

    // Verificar que hay tarjetas de pago
    const paymentCards = mobileCardsContainer.locator('.bg-slate-800');
    // Esperamos al menos una tarjeta (asumiendo que hay datos)
    // Si no hay datos, esto fallará, lo cual es bueno para verificar que los datos se cargaron
    await expect(paymentCards.first()).toBeVisible();
  });

  test('Test 2: Tablet View (iPad)', async ({ page, loginPage }) => {
    // 1. Configurar viewport para iPad Mini (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });

    // 2. Navegar a /portal
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    await expect(page).toHaveURL(/\/portal/);

    // 3. Validar que layout se ajusta a tablet
    // Verificar que los elementos son legibles y el layout es correcto
    // En tablet, el menú lateral podría estar visible o colapsado dependiendo del diseño
    // Asumimos que en md:block (768px) el sidebar es visible
    const sidebar = page.locator('aside');
    if ((await sidebar.count()) > 0) {
      await expect(sidebar).toBeVisible();
    }
  });

  test('Test 3: Desktop View', async ({ page, loginPage }) => {
    // 1. Configurar viewport para Desktop (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 2. Navegar a /portal
    await loginPage.goto();
    await loginPage.login('cliente.prueba@quintas.com', 'Prueba123!');
    await expect(page).toHaveURL(/\/portal/);

    // 3. Validar que layout se ajusta a desktop
    // El sidebar debe ser visible
    const sidebar = page.locator('aside');
    if ((await sidebar.count()) > 0) {
      await expect(sidebar).toBeVisible();
    }

    // 4. Validar que todo es visible sin scroll horizontal (en el body)
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth);
  });
});

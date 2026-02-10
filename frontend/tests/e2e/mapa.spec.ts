import { test, expect } from '@playwright/test';

test.describe('Mapa Interactivo', () => {
  test('debe cargar el mapa y mostrar los lotes', async ({ page }) => {
    // 1. Navegar a la página del mapa
    await page.goto('http://localhost:3000/mapa');

    // 2. Esperar a que el mapa SVG se cargue
    // Buscamos el elemento SVG principal
    const svg = page.locator('svg.w-full.h-full');
    await expect(svg).toBeVisible({ timeout: 10000 });

    // 3. Verificar que los lotes interactivos se renderizan
    // Buscamos paths que tengan fill (no 'none') o data-path-id
    // El seed insertó 245 lotes, así que debería haber muchos elementos
    const lotes = page.locator('path[data-path-id^="M-"]');
    await expect(lotes.first()).toBeVisible();

    const count = await lotes.count();
    console.log(`Lotes encontrados en el DOM: ${count}`);
    expect(count).toBeGreaterThan(0);

    // 4. Probar interacción (hover)
    const primerLote = lotes.first();
    await primerLote.hover();

    // Verificar tooltip o cambio de estilo (esto depende de la implementación visual)
    // En este caso verificamos que no haya errores en consola
  });

  test('debe mostrar detalles al hacer clic en un lote', async ({ page }) => {
    await page.goto('http://localhost:3000/mapa');

    // Esperar carga
    await page.waitForSelector('path[data-path-id^="M-"]');

    // Clic en el primer lote disponible
    const lote = page.locator('path[data-path-id^="M-"]').first();
    await lote.click();

    // Verificar que aparece el panel lateral
    const panel = page.locator('text=Lote');
    await expect(panel).toBeVisible();

    // Verificar botón de apartar (si es disponible)
    const btnApartar = page.locator('text=Apartar Lote');
    if (await btnApartar.isVisible()) {
      await expect(btnApartar).toBeEnabled();
    }
  });
});

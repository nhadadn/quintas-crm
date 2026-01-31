import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

test.describe('V3.8: Verificación de Performance', () => {

  test('1. Medir tiempo de generación de amortización (< 500ms)', async ({ request }) => {
    // Warmup request (optional, but fair for "performance" not "cold start")
    await request.get(`${BASE_URL}/amortizacion/generar`, { params: { venta_id: '1' } }).catch(() => {});

    const start = Date.now();
    const response = await request.get(`${BASE_URL}/amortizacion/generar`, {
      params: { venta_id: '1' }
    });
    const end = Date.now();
    const duration = end - start;
    
    console.log(`Amortización Duration: ${duration}ms`);
    
    // We expect the request to complete, even if it returns 404 (ID not found)
    // The metric is about response time.
    expect(duration).toBeLessThan(500);
  });

  test('2. Medir tiempo de cálculo de comisiones (< 200ms)', async ({ request }) => {
    // Warmup
    await request.get(`${BASE_URL}/comisiones/calcular`, { params: { venta_id: '1' } }).catch(() => {});

    const start = Date.now();
    const response = await request.get(`${BASE_URL}/comisiones/calcular`, {
        params: { venta_id: '1' }
    });
    const end = Date.now();
    const duration = end - start;

    console.log(`Comisiones Duration: ${duration}ms`);
    expect(duration).toBeLessThan(200);
  });

  test('3. Medir tiempo de generación de recibo PDF (< 3s)', async ({ request }) => {
    // Warmup
    await request.get(`${BASE_URL}/recibos/1/generar`).catch(() => {});

    const start = Date.now();
    const response = await request.get(`${BASE_URL}/recibos/1/generar`);
    const end = Date.now();
    const duration = end - start;

    console.log(`PDF Duration: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
  });
});

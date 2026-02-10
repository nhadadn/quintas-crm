# Testing Stripe E2E - Quintas de Otinapa

## 1. Escenarios de Test End-to-End

Estas pruebas validan el flujo completo desde la interfaz de usuario hasta el procesamiento final, simulando un usuario real.

### Escenario A: Pago de Enganche

1.  Usuario navega a "Mis Pagos".
2.  Selecciona "Pagar Enganche" ($5,000).
3.  Ingresa datos de tarjeta (Tarjeta de Test Stripe `4242...`).
4.  Confirma pago.
5.  **Verificación:**
    - UI muestra "Pago Exitoso".
    - Redirección a pantalla de recibo.
    - Backend recibe webhook.
    - Estatus en CRM cambia a `pagado`.

### Escenario B: Manejo de Errores (Tarjeta Declinada)

1.  Usuario intenta pagar.
2.  Ingresa tarjeta de test para declinación (generadora de errores).
3.  **Verificación:**
    - UI muestra mensaje de error específico ("Tu tarjeta fue declinada").
    - No se redirige.
    - Usuario puede reintentar.

## 2. Setup de Playwright

Configuración recomendada para tests automatizados de UI.

```typescript
// tests/e2e/stripe-payment.spec.ts
import { test, expect } from '@playwright/test';

test('Debe procesar un pago exitoso con tarjeta de prueba', async ({ page }) => {
  await page.goto('/portal/pagos/nuevo');

  // Rellenar formulario de Stripe (iframe)
  // Nota: Interactuar con Stripe Elements requiere manejo especial de iframes
  const frame = page.frameLocator('iframe[title="Secure payment input frame"]');
  await frame.locator('input[name="cardnumber"]').fill('4242424242424242');
  await frame.locator('input[name="exp-date"]').fill('12/34');
  await frame.locator('input[name="cvc"]').fill('123');

  await page.click('button:has-text("Pagar")');

  await expect(page.locator('text=Pago Exitoso')).toBeVisible();
});
```

## 3. Fixtures de Datos

Para ejecutar los tests repetitivamente, se debe usar un script de seed que reinicie el estado de la venta a `pendiente` antes de cada ejecución.

```json
// fixtures/venta-pendiente.json
{
  "lote_id": "lote-123",
  "cliente_id": "cliente-test",
  "monto": 5000,
  "estatus": "apartado"
}
```

## 4. Resultados de Tests

| ID      | Escenario                  | Estado     | Última Ejecución          |
| :------ | :------------------------- | :--------- | :------------------------ |
| E2E-001 | Pago Enganche (Happy Path) | ⏳ Pending |                           |
| E2E-002 | Tarjeta Declinada          | ⏳ Pending |                           |
| E2E-003 | Validación 3D Secure       | ⏳ Pending | Requiere tarjeta test 3DS |

## 5. Screenshots

_(Espacio reservado para capturas de pantalla de ejecuciones exitosas)_

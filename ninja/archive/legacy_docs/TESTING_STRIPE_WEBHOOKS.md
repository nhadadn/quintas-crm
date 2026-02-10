# Testing Stripe Webhooks - Quintas de Otinapa

## 1. Estrategia de Testing

Dado que los webhooks son asíncronos y dependen de eventos externos, la estrategia se basa en:

1.  **Simulación Local:** Usar Stripe CLI para disparar eventos manualmente.
2.  **Validación de Logs:** Verificar que el backend reciba y procese el evento.
3.  **Verificación en BD:** Confirmar que los cambios de estado (pagado, fallido) se reflejen en la base de datos.

## 2. Setup de Stripe CLI

1.  **Instalar CLI:**
    ```bash
    # Windows (via Scoop)
    scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
    scoop install stripe
    ```
2.  **Login:**
    ```bash
    stripe login
    ```
3.  **Iniciar Listener:**
    ```bash
    stripe listen --forward-to localhost:8055/stripe/webhook
    ```

## 3. Casos de Prueba (Webhooks)

### Caso 1: Pago Exitoso (`payment_intent.succeeded`)

Simula que un cliente completó un pago correctamente.

**Comando:**

```bash
stripe trigger payment_intent.succeeded
```

**Resultado Esperado:**

- CLI muestra `200 OK` del servidor local.
- Backend Log: `Evento recibido: payment_intent.succeeded`.
- Backend Log: `Pago actualizado a 'pagado'`.
- BD: El registro en `pagos` asociado (si existe mock) cambia estatus a `pagado`.

### Caso 2: Pago Fallido (`payment_intent.payment_failed`)

Simula un rechazo de tarjeta.

**Comando:**

```bash
stripe trigger payment_intent.payment_failed
```

**Resultado Esperado:**

- Backend Log: `Evento recibido: payment_intent.payment_failed`.
- BD: El registro en `pagos` cambia estatus a `fallido` o se registra el intento fallido.

### Caso 3: Suscripción Creada (`invoice.payment_succeeded`)

Para pagos recurrentes (mensualidades).

**Comando:**

```bash
stripe trigger invoice.payment_succeeded
```

**Resultado Esperado:**

- Backend identifica la suscripción.
- BD: Se registra el pago de la mensualidad correspondiente en `amortizaciones`.

## 4. Resultados de Tests (Bitácora)

| Fecha      | Test Case         | Resultado  | Observaciones                        |
| :--------- | :---------------- | :--------- | :----------------------------------- |
| 2026-02-04 | Setup CLI         | ✅ Pass    | Listener conecta correctamente.      |
| 2026-02-04 | Trigger Succeeded | ⏳ Pending | Pendiente implementación de handler. |
|            |                   |            |                                      |

## 5. Known Issues

- **Timeouts:** Si el debugger detiene la ejecución en el backend por más de 30s, Stripe reenviará el evento.
- **Datos Mock:** Los eventos disparados por `stripe trigger` tienen datos falsos. Para probar con datos reales, se debe iniciar un flujo real desde el Frontend apuntando al backend local.

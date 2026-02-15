# Servicio de Suscripciones (Stripe Subscriptions)

Este módulo implementa la gestión de suscripciones utilizando la API de Stripe y sincronizando el estado con Directus.

## Configuración

Asegúrese de que las siguientes variables de entorno estén configuradas:
- `STRIPE_SECRET_KEY`: Llave secreta de Stripe.

## Uso del Servicio

El servicio `StripeSubscriptionsService` expone métodos para gestionar el ciclo de vida de las suscripciones.

### Métodos Principales

#### `createSubscription(customerId, priceId, paymentMethodId, metadata)`
Crea una nueva suscripción en Stripe y la registra en Directus.
- **customerId**: ID del cliente en Directus.
- **priceId**: ID del precio en Stripe.
- **paymentMethodId**: (Opcional) ID del método de pago.

#### `updateSubscription(subscriptionId, newPriceId)`
Actualiza el plan (precio) de una suscripción existente. Maneja prorrateo automáticamente.

#### `cancelSubscription(subscriptionId, immediate)`
Cancela una suscripción.
- **immediate**: `true` para cancelar inmediatamente, `false` para cancelar al final del periodo.

#### `listSubscriptions(customerId)`
Lista las suscripciones activas de un cliente.

### Ejemplos de Uso (Código)

```javascript
// Instanciar servicio (normalmente inyectado en endpoints)
const subscriptionService = new StripeSubscriptionsService({ services, database, accountability, getSchema });

// Crear suscripción
const sub = await subscriptionService.createSubscription(
  'cliente_uuid', 
  'price_12345', 
  null, 
  { venta_id: 'venta_uuid' }
);

// Cambiar plan
await subscriptionService.updateSubscription(sub.id, 'price_new_54321');

// Cancelar al final del periodo
await subscriptionService.cancelSubscription(sub.id, false);
```

## Endpoints API

El servicio se expone a través de los siguientes endpoints en la extensión `endpoint-pagos`:

- `POST /pagos/suscripciones/crear`
- `PUT /pagos/suscripciones/:id/cambiar-plan`
- `POST /pagos/suscripciones/:id/cancelar`
- `POST /pagos/suscripciones/:id/pausar`
- `POST /pagos/suscripciones/:id/reanudar`
- `GET /pagos/suscripciones/:id`
- `GET /pagos/suscripciones?cliente_id=...`

## Módulo de Reportes

El endpoint incluye un servicio robusto de generación de reportes financieros y operativos.

### Funcionalidades
- **Reportes de Ventas**: Desglose por periodo, vendedor y estatus.
- **Reportes de Pagos**: Detalle de ingresos por método de pago.
- **Métricas de Clientes**: Adquisición y retención.
- **Cálculo de Comisiones**: Para vendedores.
- **KPIs**: Indicadores clave de rendimiento.

Para ver la documentación completa de los endpoints de reportes, consulte [docs/api/endpoints/reportes.md](../../docs/api/endpoints/reportes.md).

## Tests

Para ejecutar los tests unitarios:

```bash
npm test
```

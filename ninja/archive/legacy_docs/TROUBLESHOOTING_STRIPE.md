# Troubleshooting Stripe - Quintas de Otinapa

Este documento recopila los errores más comunes al integrar Stripe y sus soluciones.

## 1. Errores de API Comunes

### `StripeInvalidRequestError`

- **Causa:** Parámetros faltantes o inválidos en la solicitud (ej. `amount` no es entero positivo, `currency` no soportada).
- **Solución:**
  - Verificar que `amount` esté en centavos (ej. $100.00 MXN -> `10000`).
  - Asegurar que todos los campos requeridos (`currency`, `payment_method_types`) estén presentes.
  - Revisar logs del backend para ver el mensaje detallado de Stripe.

### `StripeAuthenticationError`

- **Causa:** API Key incorrecta o expirada.
- **Solución:**
  - Verificar `STRIPE_SECRET_KEY` en `.env`.
  - Asegurar que no hay espacios en blanco al copiar la clave.
  - Confirmar si se está usando clave de Test (`sk_test_...`) o Live (`sk_live_...`) según el entorno.

### `StripeConnectionError`

- **Causa:** Problemas de red al conectar con los servidores de Stripe.
- **Solución:**
  - Verificar conexión a internet.
  - Revisar configuración de DNS o Firewall.
  - Implementar reintentos automáticos (exponential backoff).

### `StripeCardError`

- **Causa:** La tarjeta fue rechazada por el banco emisor (fondos insuficientes, fraude, etc.).
- **Solución:**
  - Manejar el error en el Frontend y mostrar mensaje amigable al usuario.
  - No reintentar automáticamente la misma tarjeta muchas veces.
  - Sugerir al usuario contactar a su banco.

## 2. Problemas con Webhooks

### Error 400: `Webhook signature verification failed`

- **Causa:** El `STRIPE_WEBHOOK_SECRET` no coincide con el que firmó el evento.
- **Solución:**
  - Si usas Stripe CLI, asegura que el secret (`whsec_...`) copiado sea el que imprimió el comando `stripe listen`.
  - En producción, verificar el secret en el Dashboard de Stripe -> Developers -> Webhooks.
  - Asegurar que se está pasando el cuerpo _raw_ (buffer) a la función de verificación, no el JSON parseado.

### Eventos Duplicados

- **Causa:** Stripe puede enviar el mismo evento múltiples veces si no recibe un 200 OK rápido.
- **Solución:**
  - Implementar idempotencia: Guardar `event.id` procesados en BD y descartar si ya existe.
  - Responder `200 OK` inmediatamente antes de ejecutar lógica pesada.

## 3. Logs y Debugging

### Logs del Backend

Habilitar logs detallados en desarrollo:

```javascript
// En StripeService
console.log('Stripe Request:', { method, url, params });
console.log('Stripe Error:', error.type, error.message);
```

### Dashboard de Stripe

- **Logs de API:** Ver todas las peticiones recibidas y respuestas enviadas. Útil para ver por qué falló un `createPaymentIntent`.
- **Eventos:** Ver el historial de Webhooks enviados y la respuesta de tu servidor.

## 4. Contacto de Soporte

- **Documentación Oficial:** https://stripe.com/docs
- **Status Page:** https://status.stripe.com/
- **Soporte Directo:** https://support.stripe.com/contact

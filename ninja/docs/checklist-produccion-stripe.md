# Checklist de Configuración y Despliegue de Stripe en Producción

Este documento detalla los pasos críticos para asegurar que la integración de Stripe funcione correctamente en el entorno de producción.

## 1. Verificación de Credenciales

- [ ] **Modo Live Activado**: Asegurar que las credenciales `sk_live_...` y `pk_live_...` se usen en producción, NO las de test.
- [ ] **Variables de Entorno**:
  - `STRIPE_SECRET_KEY`: Debe comenzar con `sk_live_`.
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Debe comenzar con `pk_live_`.
  - `STRIPE_WEBHOOK_SECRET`: Debe corresponder al endpoint configurado en el Dashboard de Stripe para producción.
  - `STRIPE_CURRENCY`: Generalmente `mxn` para México.

## 2. Configuración en Dashboard de Stripe

- [ ] **Webhooks**:
  - Endpoint configurado: `https://crm.quintas.com/api/webhooks/stripe` (o dominio real).
  - Eventos suscritos mínimos:
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
    - `charge.refunded`
    - `invoice.payment_succeeded` (si se usan suscripciones)
    - `customer.subscription.updated` (si se usan suscripciones)
    - `customer.subscription.deleted` (si se usan suscripciones)
- [ ] **Cuenta Bancaria**: Verificar que la cuenta de depósito esté verificada y activa.
- [ ] **Branding**: Configurar nombre del negocio, logo y colores en la configuración de Checkout/Portal.

## 3. Pruebas de Integración (Pre-Lanzamiento)

- [ ] **Flujo de Pago Completo**: Realizar un pago real de monto bajo (ej. $10 MXN) para verificar el flujo de principio a fin.
- [ ] **Reembolsos**: Verificar que el reembolso de la prueba anterior funcione desde el Dashboard de Admin del CRM.
- [ ] **Suscripciones (si aplica)**: Crear una suscripción de prueba y verificar el primer cobro.
- [ ] **Webhooks**: Verificar en los logs del servidor y de Stripe que los eventos se reciben con código `200 OK`.

## 4. Seguridad y Monitoreo

- [ ] **HTTPS**: El sitio debe servir exclusivamente sobre HTTPS (requerido por Stripe Elements/Checkout).
- [ ] **Logs**: Asegurar que los logs de errores de Stripe se envíen a un sistema de monitoreo (ej. Sentry, CloudWatch).
- [ ] **Alertas**: Configurar alertas para picos de pagos fallidos (indicador de fraude o error técnico).

## 5. Frontend y UX

- [ ] **Manejo de Errores**: Verificar que se muestren mensajes amigables al usuario si la tarjeta es declinada.
- [ ] **Loading States**: Verificar que el botón de pago se deshabilite y muestre spinner durante el procesamiento.
- [ ] **Confirmación**: Verificar que el usuario sea redirigido a una página de "Pago Exitoso" tras la transacción.

## 6. Documentación Interna

- [ ] **Rotación de Claves**: Documentar proceso para rotar API keys en caso de compromiso.
- [ ] **Contactos**: Tener a mano los contactos de soporte de Stripe y del banco.

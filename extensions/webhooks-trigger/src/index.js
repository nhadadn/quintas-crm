import axios from 'axios';
import crypto from 'crypto';

export default ({ action, schedule }, { services, getSchema, logger }) => {
  const { ItemsService } = services;

  // =================================================================================
  // 1. TRIGGER WEBHOOK (Al crear/actualizar entidades)
  // =================================================================================

  // Función auxiliar para disparar eventos
  const triggerWebhook = async (eventType, payload, schema) => {
    try {
      // Usar contexto de sistema para leer suscripciones
      const subscriptionsService = new ItemsService('webhooks_subscriptions', { schema });
      const logsService = new ItemsService('webhooks_delivery_logs', { schema });

      // Buscar suscripciones activas para este evento
      const subscriptions = await subscriptionsService.readByQuery({
        filter: {
          event_type: { _eq: eventType },
          is_active: { _eq: true },
        },
      });

      if (!subscriptions || subscriptions.length === 0) return;

      logger.info(`[Webhook] Triggering ${eventType} for ${subscriptions.length} subscribers`);

      // Crear logs pendientes para cada suscriptor
      for (const sub of subscriptions) {
        await logsService.createOne({
          subscription_id: sub.id,
          event_type: eventType,
          payload: payload,
          delivery_status: 'pending',
          attempts: 0,
          next_retry_at: new Date().toISOString(), // Listo para procesar ya
        });
      }
    } catch (error) {
      logger.error(`[Webhook] Error triggering ${eventType}: ${error.message}`);
    }
  };

  // Hook: Venta Creada
  action('ventas.items.create', async (meta, { schema }) => {
    // meta.payload contiene los datos insertados, meta.key la ID
    // Necesitamos leer el objeto completo para tener contexto
    try {
      const ventasService = new ItemsService('ventas', { schema });
      const venta = await ventasService.readOne(meta.key);
      await triggerWebhook('venta.created', venta, schema);
    } catch (e) {
      logger.error(`[Webhook] Error in venta.created hook: ${e.message}`);
    }
  });

  // Hook: Venta Completada (cuando estatus cambia a 'liquidado' o similar)
  // Asumimos que 'estatus' es el campo clave
  action('ventas.items.update', async (meta, { schema }) => {
    if (meta.payload.estatus === 'liquidado' || meta.payload.estatus === 'contrato') {
      try {
        const ventasService = new ItemsService('ventas', { schema });
        const venta = await ventasService.readOne(meta.keys[0]);
        await triggerWebhook(`venta.${meta.payload.estatus}`, venta, schema);
      } catch (e) {
        logger.error(`[Webhook] Error in venta.update hook: ${e.message}`);
      }
    }
  });

  // Hook: Pago Completado
  action('pagos.items.create', async (meta, { schema }) => {
    try {
      const pagosService = new ItemsService('pagos', { schema });
      const pago = await pagosService.readOne(meta.key);
      // Solo si el pago está completado (o si se crea directamente como tal)
      if (pago.estatus === 'pagado' || !pago.estatus) {
        // Asumir pagado si no hay estatus
        await triggerWebhook('pago.completed', pago, schema);
      }
    } catch (e) {
      logger.error(`[Webhook] Error in pago.create hook: ${e.message}`);
    }
  });

  // =================================================================================
  // 2. PROCESS QUEUE (Cron Job)
  // =================================================================================

  // Ejecutar cada 30 segundos (o 1 minuto, Directus cron mínimo suele ser configurable)
  // Sintaxis cron estándar: '*/1 * * * *' (cada minuto) o '*/30 * * * * *' (segundos si soporta)
  // Directus schedule usa node-schedule.
  schedule('*/30 * * * * *', async () => {
    // Cada 30 segundos
    try {
      const schema = await getSchema();
      const logsService = new ItemsService('webhooks_delivery_logs', { schema });
      const subscriptionsService = new ItemsService('webhooks_subscriptions', { schema });

      // Buscar logs pendientes o retrying cuya fecha de retry ya pasó
      const now = new Date();
      const logsToProcess = await logsService.readByQuery({
        filter: {
          _and: [
            { delivery_status: { _in: ['pending', 'retrying'] } },
            { next_retry_at: { _lte: now.toISOString() } },
          ],
        },
        limit: 50, // Procesar en lotes
      });

      if (!logsToProcess || logsToProcess.length === 0) return;

      logger.info(`[Webhook] Processing ${logsToProcess.length} pending logs`);

      for (const log of logsToProcess) {
        // Obtener suscripción para URL y Secret
        const subscription = await subscriptionsService.readOne(log.subscription_id);

        if (!subscription || !subscription.is_active) {
          // Si no existe o inactiva, marcar log como fallido final
          await logsService.updateOne(log.id, {
            delivery_status: 'failed',
            response_body: 'Subscription inactive or deleted',
          });
          continue;
        }

        try {
          // Calcular Firma HMAC SHA256
          const payloadString = JSON.stringify(log.payload);
          const signature = crypto
            .createHmac('sha256', subscription.secret)
            .update(payloadString)
            .digest('hex');

          // Enviar Request
          const response = await axios.post(subscription.url, log.payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${signature}`,
              'X-Webhook-Event': log.event_type,
              'User-Agent': 'QuintasERP-Webhook/1.0',
            },
            timeout: 5000, // 5s timeout
          });

          // ÉXITO
          await logsService.updateOne(log.id, {
            delivery_status: 'delivered',
            delivered_at: new Date().toISOString(),
            response_status: response.status,
            response_body: JSON.stringify(response.data).substring(0, 2000), // Truncar si es muy largo
          });

          // Actualizar métricas de suscripción
          await subscriptionsService.updateOne(subscription.id, {
            last_success_at: new Date().toISOString(),
            failure_count: 0,
          });
        } catch (requestError) {
          // ERROR
          const status = requestError.response?.status || 0;
          const body = requestError.response?.data
            ? JSON.stringify(requestError.response.data)
            : requestError.message;

          const newAttempts = (log.attempts || 0) + 1;
          const isFinalFail = newAttempts >= 3;

          // Calcular Backoff: 1s, 5s, 30s...
          // simple: 5^attempts segundos
          const delaySeconds = Math.pow(5, newAttempts);
          const nextRetry = new Date(now.getTime() + delaySeconds * 1000);

          await logsService.updateOne(log.id, {
            delivery_status: isFinalFail ? 'failed' : 'retrying',
            attempts: newAttempts,
            next_retry_at: isFinalFail ? null : nextRetry.toISOString(),
            response_status: status,
            response_body: body.substring(0, 2000),
          });

          // Actualizar métricas de suscripción
          await subscriptionsService.updateOne(subscription.id, {
            last_failure_at: new Date().toISOString(),
            failure_count: (subscription.failure_count || 0) + 1,
          });

          // Desactivar suscripción si falla demasiado (Circuit Breaker)
          if ((subscription.failure_count || 0) + 1 >= 10) {
            await subscriptionsService.updateOne(subscription.id, { is_active: false });
            logger.warn(
              `[Webhook] Subscription ${subscription.id} deactivated due to excessive failures`
            );
          }
        }
      }
    } catch (error) {
      logger.error(`[Webhook] Error in queue processor: ${error.message}`);
      logger.error(error.stack);
    }
  });
};

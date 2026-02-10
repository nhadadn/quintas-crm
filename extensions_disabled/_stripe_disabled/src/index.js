import Stripe from 'stripe';
import crypto from 'crypto';
import { processEventWithRetry } from './webhook-service.js';
import { createSubscription } from './subscription-service.js';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  getPaymentHistory,
  processRefund,
} from './payment-service.js';

export default (router, { services, exceptions, database, getSchema }) => {
  const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  };

  router.post('/refund', async (req, res) => {
    try {
      const stripe = getStripe();
      const result = await processRefund(
        stripe,
        services,
        await getSchema(),
        req.accountability,
        req.body
      );
      res.json(result);
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/payment-history', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.user) {
        return res.status(403).send('Forbidden');
      }
      const result = await getPaymentHistory(
        services,
        await getSchema(),
        req.accountability,
        req.query
      );
      res.json(result);
    } catch (error) {
      console.error('Error getting payment history:', error);
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/payment-status/:payment_intent_id', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.user) {
        return res.status(403).send('Forbidden');
      }
      const stripe = getStripe();
      const result = await getPaymentStatus(
        stripe,
        services,
        await getSchema(),
        req.accountability,
        req.params.payment_intent_id
      );
      res.json(result);
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/create-payment-intent', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.user) {
        return res.status(403).send('Forbidden');
      }
      const stripe = getStripe();
      const result = await createPaymentIntent(
        stripe,
        services,
        await getSchema(),
        req.accountability,
        req.body
      );
      res.json(result);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const status = error.status || 400;
      res.status(status).json({ error: error.message });
    }
  });

  router.post('/confirm-payment', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.user) {
        return res.status(403).send('Forbidden');
      }
      const stripe = getStripe();
      const result = await confirmPayment(
        stripe,
        services,
        await getSchema(),
        req.accountability,
        req.body
      );
      res.json(result);
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/create-subscription', async (req, res) => {
    try {
      // Validar autenticación básica (usuario logueado)
      if (!req.accountability || !req.accountability.user) {
        return res.status(403).send('Forbidden');
      }

      const stripe = getStripe();
      const result = await createSubscription(
        req.body,
        { services, database, getSchema, accountability: req.accountability },
        stripe
      );

      res.json(result);
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    // 1. Verificar Firma
    try {
      const stripe = getStripe();
      if (endpointSecret) {
        const payload = req.rawBody || req.body;
        // Nota: Directus necesita rawBody para verificar firma.
        if (!req.rawBody && typeof req.body === 'object') {
          console.warn(
            '⚠️ req.rawBody no disponible. La verificación de firma puede fallar si el body fue parseado.'
          );
        }
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      } else {
        event = req.body;
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET no configurado. Saltando verificación de firma.');
      }
    } catch (err) {
      console.error(`❌ Webhook Error (Firma): ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Idempotencia y Logging
    const schema = await getSchema();

    const trx = await database.transaction();

    try {
      // Verificar si ya existe
      const existingLog = await trx('stripe_webhooks_logs')
        .where({ stripe_event_id: event.id })
        .first();

      if (existingLog && existingLog.processed) {
        console.log(`ℹ️ Evento ${event.id} ya procesado.`);
        await trx.commit();
        return res.json({ received: true });
      }

      if (!existingLog) {
        // Insertar nuevo log
        await trx('stripe_webhooks_logs').insert({
          id: crypto.randomUUID(),
          stripe_event_id: event.id,
          event_type: event.type,
          payload: JSON.stringify(event),
          processed: false,
          attempts: 0,
        });
      }

      await trx.commit(); // Commit inicial para guardar recepción
    } catch (error) {
      await trx.rollback();
      console.error('Error logging webhook:', error);
      return res.status(500).send('Logging Error');
    }

    // 3. Procesar Evento (Async fire-and-forget)
    res.json({ received: true, processing: true });

    // Background processing
    (async () => {
      try {
        const result = await processEventWithRetry(event, services, schema, database);

        // Actualizar Log
        await database('stripe_webhooks_logs').where({ stripe_event_id: event.id }).update({
          processed: result.success,
          attempts: result.attempts,
          last_error: result.lastError,
          updated_at: new Date(),
        });

        console.log(`🏁 Evento ${event.id} finalizado. Success: ${result.success}`);
      } catch (err) {
        console.error(`❌ Fatal error in background webhook processing for ${event.id}:`, err);
        // Actualizar log como fallido fatal
        await database('stripe_webhooks_logs')
          .where({ stripe_event_id: event.id })
          .update({
            last_error: `Fatal: ${err.message}`,
            attempts: 999,
          });
      }
    })();
  });

  // Endpoint para reintentos manuales
  router.post('/retry-failed', async (req, res) => {
    if (!req.accountability || !req.accountability.admin) {
      return res.status(403).send('Forbidden');
    }

    try {
      const failedLogs = await database('stripe_webhooks_logs')
        .where({ processed: false })
        .whereNotNull('last_error')
        .limit(50); // Límite por lote

      const schema = await getSchema();
      const results = [];

      for (const log of failedLogs) {
        const event = JSON.parse(log.payload);
        console.log(`🔄 Manually retrying event ${event.id}`);

        const result = await processEventWithRetry(event, services, schema, database);

        await database('stripe_webhooks_logs')
          .where({ id: log.id })
          .update({
            processed: result.success,
            attempts: database.raw('attempts + ?', [result.attempts]), // Sumar intentos nuevos
            last_error: result.lastError,
            updated_at: new Date(),
          });

        results.push({ id: log.id, success: result.success });
      }

      res.json({ processed: results.length, details: results });
    } catch (error) {
      console.error('Error retrying webhooks:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

import { constructEvent } from './stripe-service.js';

export class WebhookService {
  constructor({ services, database, getSchema }) {
    this.services = services;
    this.database = database;
    this.getSchema = getSchema;
    this.itemsService = services.ItemsService;
    this.mailService = new services.MailService({ schema: null, accountability: null }); // Initialize MailService
  }

  async handleEvent(payload, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    if (secret) {
      try {
        event = constructEvent(payload, signature, secret);
      } catch (err) {
        console.error('⚠️ Webhook signature verification failed.', err.message);
        throw new Error(`Webhook Error: ${err.message}`);
      }
    } else {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Processing insecurely.');
      event = payload;
    }

    // 1. Idempotencia
    if (await this.isEventProcessed(event.id)) {
      console.log(`ℹ️ Evento ${event.id} ya procesado. Saltando.`);
      return { received: true };
    }

    const schema = await this.getSchema();
    const logsService = new this.itemsService('webhook_logs', { schema });

    // 2. Log event start
    let logId;
    try {
      logId = await logsService.createOne({
        evento_tipo: event.type,
        stripe_event_id: event.id,
        payload: event.data.object,
        estado: 'pendiente',
        fecha_recepcion: new Date(),
      });
    } catch (e) {
      console.warn('Could not create webhook log:', e.message);
    }

    try {
      // 3. Procesar Evento
      await this.processEvent(event, schema);

      // 4. Actualizar Log Exitoso
      if (logId) {
        await logsService.updateOne(logId, {
          estado: 'procesado',
          procesado_en: new Date(),
        });
      }
      return { received: true };
    } catch (err) {
      console.error(`❌ Error processing webhook ${event.type}:`, err);

      // 5. Actualizar Log Fallido
      if (logId) {
        await logsService.updateOne(logId, {
          estado: 'fallido',
          error_mensaje: err.message,
          intentos: 1, // En un sistema real, incrementaríamos esto
        });
      }

      // Lanzar error para que Stripe reintente (500)
      throw err;
    }
  }

  async isEventProcessed(eventId) {
    const schema = await this.getSchema();
    const logsService = new this.itemsService('webhook_logs', { schema });
    const existing = await logsService.readByQuery({
      filter: {
        stripe_event_id: { _eq: eventId },
        estado: { _eq: 'procesado' },
      },
      limit: 1,
      fields: ['id'],
    });
    return existing.length > 0;
  }

  async processEvent(event, schema) {
    console.log(`🔄 Processing event: ${event.type}`);

    switch (event.type) {
      // --- Suscripciones ---
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object, schema);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await this.handleSubscriptionUpdated(event.data.object, schema, event.type);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object, schema);
        break;

      // --- Facturas (Pagos de Suscripción) ---
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object, schema);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object, schema);
        break;
      case 'invoice.payment_action_required':
        await this.notifyUserActionRequired(event.data.object, schema);
        break;

      // --- Reembolsos ---
      case 'charge.refunded': // Standard Stripe event
      case 'charge.refund.updated':
      case 'charge.refund.succeeded': // As requested
        await this.handleRefundEvent(event.data.object, schema, event.type);
        break;

      case 'charge.refund.failed':
        await this.handleRefundFailed(event.data.object, schema);
        break;

      // --- Pagos Únicos (Payment Intents) ---
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object, schema);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object, schema);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  async handlePaymentIntentSucceeded(paymentIntent, schema) {
    const pagosService = new this.itemsService('pagos', { schema });
    const ventasService = new this.itemsService('ventas', { schema });
    const lotesService = new this.itemsService('lotes', { schema });

    // 1. Buscar el pago asociado
    console.log('Searching payment for intent:', paymentIntent.id);
    const pagos = await pagosService.readByQuery({
      filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
      limit: 1,
    });
    console.log('Found payments:', pagos);

    if (pagos.length === 0) {
      console.warn(`⚠️ PaymentIntent ${paymentIntent.id} succeeded but no local payment found.`);
      return;
    }

    const pago = pagos[0];
    if (pago.estatus === 'pagado') {
      console.log(`ℹ️ Pago ${pago.id} ya marcado como pagado.`);
      return;
    }

    // 1.1 Idempotencia específica de ledger: evitar duplicar movimientos por reintentos de Stripe
    const existingMov = await this.database('pagos_movimientos')
      .where({ stripe_payment_intent_id: paymentIntent.id })
      .first();
    if (existingMov) {
      console.log(
        `ℹ️ Movimientos para intent ${paymentIntent.id} ya existen en ledger. Saltando inserción de movimientos.`
      );
    }

    // 2. Actualizar estatus
    const last4 = paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4 || null;

    await pagosService.updateOne(pago.id, {
      estatus: 'pagado',
      fecha_pago: new Date(),
      metodo_pago: 'tarjeta',
      stripe_last4: last4,
      monto_pagado: pago.monto, // Asumimos pago completo
      updated_at: new Date(),
    });

    console.log(`✅ Pago ${pago.id} actualizado a PAGADO via Webhook.`);

    // 3. Propagación de pago a amortización y venta
    try {
      if (pago.venta_id) {
        // Aplicar el pago FIFO registrando movimientos en el ledger (triggers recalculan amortización)
        if (!existingMov) {
          await this._aplicarPagoAmortizacion(
            pago.venta_id,
            parseFloat(pago.monto || 0),
            pago.id,
            { stripe_payment_intent_id: paymentIntent.id }
          );
        }

        // Recalcular estado de la venta y del lote
        const pendiente = await this.database('amortizacion')
          .where({ venta_id: pago.venta_id })
          .whereIn('estatus', ['pendiente', 'parcial'])
          .count('id as count')
          .first();

        const restantes = parseInt(pendiente?.count || 0);

        if (restantes === 0) {
          const sumaSaldo = await this.database('amortizacion')
            .where({ venta_id: pago.venta_id })
            .sum('saldo_final as total')
            .first();

          const deuda = parseFloat(sumaSaldo?.total || 0);
          if (deuda < 1) {
            const venta = await ventasService.readOne(pago.venta_id);
            if (venta?.estatus !== 'pagada') {
              await ventasService.updateOne(pago.venta_id, {
                estatus: 'pagada',
                fecha_liquidacion: new Date(),
              });
              if (venta?.lote_id) {
                await lotesService.updateOne(venta.lote_id, { estatus: 'vendido' });
              }
              console.log(`🎉 Venta ${pago.venta_id} liquidada automáticamente por webhook.`);
            }
          }
        }
      }
    } catch (e) {
      console.error('⚠️ Error propagando pago a amortización/venta:', e);
      // No fallar el webhook; ya marcamos el pago como pagado. El cron o hooks pueden corregir después.
    }
  }

  async handlePaymentIntentFailed(paymentIntent, schema) {
    const pagosService = new this.itemsService('pagos', { schema });

    const pagos = await pagosService.readByQuery({
      filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
      limit: 1,
    });

    if (pagos.length === 0) return;

    const pago = pagos[0];
    const errorMessage = paymentIntent.last_payment_error?.message || 'Error desconocido';
    const newNote = `Intento de pago fallido: ${errorMessage}\n`;

    await pagosService.updateOne(pago.id, {
      notas: (pago.notas || '') + '\n' + newNote,
      updated_at: new Date(),
    });

    console.log(`❌ Pago ${pago.id} actualizado con error de intento.`);
  }

  async handleSubscriptionCreated(stripeSub, schema) {
    console.log(`Subscription event customer.subscription.created: ${stripeSub.id}`);
    const suscripcionesService = new this.itemsService('suscripciones', { schema });
    const usersService = new this.itemsService('directus_users', { schema });

    // 1. Guardar/Actualizar Suscripción
    // Buscamos si ya existe por ID de Stripe (idempotencia lógica)
    const existing = await suscripcionesService.readByQuery({
      filter: { stripe_subscription_id: { _eq: stripeSub.id } },
      limit: 1,
    });

    const subData = {
      stripe_subscription_id: stripeSub.id,
      estado: stripeSub.status,
      fecha_inicio: new Date(stripeSub.current_period_start * 1000),
      fecha_fin: new Date(stripeSub.current_period_end * 1000),
      cliente_stripe_id: stripeSub.customer,
      plan_id: stripeSub.items.data[0]?.price.id,
      monto: stripeSub.items.data[0]?.price.unit_amount / 100,
    };

    if (existing.length === 0) {
      // Intentar vincular con usuario de CRM
      const userId =
        stripeSub.metadata?.crm_user_id ||
        (await this.findUserIdByStripeCustomer(stripeSub.customer, schema));
      if (userId) subData.user_id = userId;

      await suscripcionesService.createOne(subData);

      // 2. Actualizar estado de usuario
      if (userId) {
        await usersService.updateOne(userId, { estado_suscripcion: 'active_subscriber' });

        // 3. Enviar email de bienvenida
        await this.sendEmail(
          userId,
          '¡Bienvenido a tu Suscripción!',
          'subscription_welcome',
          {
            plan_name: 'Plan Premium', // Deberíamos buscar el nombre del plan
            end_date: subData.fecha_fin.toLocaleDateString(),
          },
          schema
        );
      }
    }
  }

  async handleSubscriptionUpdated(stripeSub, schema, eventType) {
    const suscripcionesService = new this.itemsService('suscripciones', { schema });

    const subs = await suscripcionesService.readByQuery({
      filter: { stripe_subscription_id: { _eq: stripeSub.id } },
      limit: 1,
    });

    if (subs.length > 0) {
      const updates = {
        estado: stripeSub.status,
        fecha_fin: new Date(stripeSub.current_period_end * 1000),
        plan_id: stripeSub.items.data[0]?.price.id,
      };

      // Detectar cambios de plan (si el precio cambió)
      if (subs[0].plan_id !== updates.plan_id) {
        console.log(`📝 Cambio de plan detectado para suscripción ${stripeSub.id}`);
        // Aquí podríamos notificar el cambio
      }

      await suscripcionesService.updateOne(subs[0].id, updates);
    }
  }

  async handleSubscriptionDeleted(stripeSub, schema) {
    const suscripcionesService = new this.itemsService('suscripciones', { schema });
    const usersService = new this.itemsService('directus_users', { schema });

    const subs = await suscripcionesService.readByQuery({
      filter: { stripe_subscription_id: { _eq: stripeSub.id } },
      limit: 1,
    });

    if (subs.length > 0) {
      await suscripcionesService.updateOne(subs[0].id, {
        estado: 'canceled',
        fecha_cancelacion: new Date(),
      });

      if (subs[0].user_id) {
        await usersService.updateOne(subs[0].user_id, { estado_suscripcion: 'inactive' });

        await this.sendEmail(
          subs[0].user_id,
          'Confirmación de Cancelación',
          'subscription_canceled',
          {},
          schema
        );
      }
    }
  }

  async handleInvoicePaymentSucceeded(invoice, schema) {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    const pagosService = new this.itemsService('pagos', { schema });

    // Crear registro de pago/factura
    // Asumimos que invoice.subscription existe si es de suscripción
    if (invoice.subscription) {
      await pagosService.createOne({
        referencia: invoice.payment_intent,
        monto: invoice.amount_paid / 100,
        fecha_pago: new Date(invoice.created * 1000),
        estatus: 'pagado',
        metodo_pago: 'stripe_subscription',
        concepto: `Renovación Suscripción ${invoice.subscription}`,
        stripe_invoice_id: invoice.id,
      });

      // Enviar recibo (Stripe suele enviarlo, pero enviamos uno interno si se requiere)
      // await this.sendEmail(...)
    }
  }

  async handleInvoicePaymentFailed(invoice, schema) {
    console.error(`❌ Pago fallido para factura ${invoice.id}`);
    // Notificar al usuario y admin
    // Buscar usuario por customer id
    const userId = await this.findUserIdByStripeCustomer(invoice.customer, schema);
    if (userId) {
      await this.sendEmail(
        userId,
        'Pago de suscripción fallido',
        'payment_failed',
        {
          amount: (invoice.amount_due / 100).toFixed(2),
          link: invoice.hosted_invoice_url,
        },
        schema
      );
    }
  }

  async notifyUserActionRequired(invoice, schema) {
    // Similar a failed, pero indicando que se requiere autenticación 3DS, etc.
  }

  async handleRefundEvent(refundOrCharge, schema, type) {
    const reembolsosService = new this.itemsService('reembolsos', { schema });

    // Stripe sometimes sends the refund object directly, or the charge object with refunds list
    // 'charge.refunded' sends 'charge' object.
    // 'charge.refund.updated' sends 'refund' object (usually).

    let refundObj = refundOrCharge;
    if (refundOrCharge.object === 'charge') {
      // Tomar el último reembolso
      refundObj = refundOrCharge.refunds.data[0];
    }

    if (!refundObj) return;

    const existing = await reembolsosService.readByQuery({
      filter: { stripe_refund_id: { _eq: refundObj.id } },
      limit: 1,
    });

    if (existing.length > 0) {
      await reembolsosService.updateOne(existing[0].id, {
        estado: refundObj.status || 'succeeded', // Stripe refund status: succeeded, failed, pending
        fecha_procesado: new Date(refundObj.created * 1000),
      });
    } else {
      // Si no existe, quizás se creó fuera del CRM, podríamos crearlo
      // await reembolsosService.createOne(...)
    }
  }

  async handleRefundFailed(refund, schema) {
    const reembolsosService = new this.itemsService('reembolsos', { schema });
    const existing = await reembolsosService.readByQuery({
      filter: { stripe_refund_id: { _eq: refund.id } },
      limit: 1,
    });

    if (existing.length > 0) {
      await reembolsosService.updateOne(existing[0].id, {
        estado: 'failed',
        notas: `Falló: ${refund.failure_reason}`,
      });
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  async findUserIdByStripeCustomer(stripeCustomerId, schema) {
    // Buscar en colección de clientes o usuarios que tenga ese stripe_id
    const usersService = new this.itemsService('directus_users', { schema });
    // Asumimos campo stripe_customer_id en users o external_identifier
    const users = await usersService.readByQuery({
      filter: { stripe_customer_id: { _eq: stripeCustomerId } },
      limit: 1,
    });
    return users.length > 0 ? users[0].id : null;
  }

  async sendEmail(userId, subject, template, data, schema) {
    try {
      const usersService = new this.itemsService('directus_users', { schema });
      const user = await usersService.readOne(userId, { fields: ['email', 'first_name'] });

      if (!user || !user.email) return;

      // Simple text email for now, or HTML if template engine available
      const html = `
            <h1>Hola ${user.first_name},</h1>
            <p>${subject}</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;

      await this.mailService.send({
        to: user.email,
        from: 'noreply@quintasdeotinapa.com',
        subject: subject,
        html: html,
      });
      console.log(`📧 Email enviado a ${user.email}: ${subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

// Utilidades internas
WebhookService.prototype._aplicarPagoAmortizacion = async function (ventaId, montoPago, pagoId, opts = {}) {
  if (!ventaId || !montoPago || montoPago <= 0) return;

  let remanente = parseFloat(montoPago);
  const cuotas = await this.database('amortizacion')
    .where({ venta_id: ventaId })
    .whereIn('estatus', ['pendiente', 'parcial'])
    .orderBy('numero_pago', 'asc');

  await this.database.transaction(async (trx) => {
    for (const cuota of cuotas) {
      if (remanente <= 0.01) break;

      const montoCuota = parseFloat(cuota.monto_cuota);
      const pagadoPreviamente = parseFloat(cuota.monto_pagado || 0);
      const saldo = Math.max(montoCuota - pagadoPreviamente, 0);

      if (saldo <= 0.01) continue;

      let aPagar = 0;
      if (remanente >= saldo) {
        aPagar = saldo;
        remanente -= saldo;
      } else {
        aPagar = remanente;
        remanente = 0;
      }

      if (aPagar > 0) {
        await trx('pagos_movimientos').insert({
          id: trx.raw('UUID()'),
          pago_id: pagoId || null,
          venta_id: ventaId,
          numero_pago: cuota.numero_pago,
          fecha_movimiento: new Date(),
          monto: aPagar,
          tipo: 'abono',
          estatus: 'aplicado',
          stripe_payment_intent_id: opts.stripe_payment_intent_id || null,
        });
      }
    }
  });
};

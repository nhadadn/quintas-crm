export const processEventWithRetry = async (event, services, schema, database) => {
  let attempts = 0;
  const maxAttempts = 3;
  const delays = [1000, 5000, 30000]; // 1s, 5s, 30s

  let lastError = null;
  let success = false;

  // Use system accountability (null) for webhook processing
  const accountability = null;
  const { ItemsService } = services;
  const pagosService = new ItemsService('pagos', { schema, accountability });

  while (attempts <= maxAttempts && !success) {
    try {
      if (attempts > 0) {
        console.log(`🔄 Retry attempt ${attempts} for event ${event.id}`);
        await new Promise((resolve) => setTimeout(resolve, delays[attempts - 1]));
      }

      // Lógica de procesamiento según tipo de evento
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object, pagosService);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentFailure(event.data.object, pagosService);
          break;
        case 'charge.refunded':
          await handleRefund(event.data.object, pagosService);
          break;
        case 'payment_intent.canceled':
          await handlePaymentCanceled(event.data.object, pagosService);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionUpdate(
            event.data.object,
            event.type,
            services,
            schema,
            accountability
          );
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object, services, schema, accountability);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object, services, schema, accountability);
          break;
        default:
          // Eventos no manejados se marcan como procesados (ignorados)
          console.log(`ℹ️ Evento ignorado: ${event.type}`);
          break;
      }

      success = true;
    } catch (error) {
      console.error(
        `❌ Error processing event ${event.id} (Attempt ${attempts + 1}):`,
        error.message
      );
      lastError = error.message;
      attempts++;
    }
  }

  return { success, attempts, lastError };
};

// Handlers Específicos

const handlePaymentSuccess = async (paymentIntent, pagosService) => {
  // Buscar pago por ID de PaymentIntent
  const pagos = await pagosService.readByQuery({
    filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
    limit: 1,
  });

  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    const charges = paymentIntent.charges?.data || [];
    const charge = charges.length > 0 ? charges[0] : null;
    const paymentMethodDetails = charge?.payment_method_details || {};
    const last4 = paymentMethodDetails.card?.last4 || null;

    await pagosService.updateOne(pago.id, {
      estatus: 'pagado',
      fecha_pago: new Date(),
      metodo_pago: 'tarjeta',
      metodo_pago_detalle: paymentMethodDetails,
      stripe_last4: last4,
      stripe_customer_id: paymentIntent.customer,
    });
    console.log(`✅ Pago ${pago.id} actualizado a PAGADO`);
  } else {
    console.warn(`⚠️ PaymentIntent ${paymentIntent.id} no asociado a ningún pago en DB`);
  }
};

const handlePaymentFailure = async (paymentIntent, pagosService) => {
  const pagos = await pagosService.readByQuery({
    filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
    limit: 1,
  });

  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    const failureMessage = paymentIntent.last_payment_error?.message || 'Fallo desconocido';

    const notas = pago.notas ? `${pago.notas}\n` : '';

    await pagosService.updateOne(pago.id, {
      estatus: 'fallido',
      notas: `${notas}[${new Date().toISOString()}] Fallo Stripe: ${failureMessage}`,
    });
    console.log(`❌ Pago ${pago.id} registrado fallo: ${failureMessage}`);
  }
};

const handleRefund = async (charge, pagosService) => {
  const paymentIntentId = charge.payment_intent;
  const pagos = await pagosService.readByQuery({
    filter: { stripe_payment_intent_id: { _eq: paymentIntentId } },
    limit: 1,
  });

  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    await pagosService.updateOne(pago.id, {
      estatus: 'reembolsado',
      notas:
        (pago.notas || '') +
        `\n[${new Date().toISOString()}] Reembolsado: ${charge.amount_refunded / 100} ${charge.currency}`,
    });
    console.log(`↩️ Pago ${pago.id} marcado como REEMBOLSADO`);
  }
};

const handlePaymentCanceled = async (paymentIntent, pagosService) => {
  const pagos = await pagosService.readByQuery({
    filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
    limit: 1,
  });

  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    await pagosService.updateOne(pago.id, {
      estatus: 'cancelado',
      notas: (pago.notas || '') + `\n[${new Date().toISOString()}] Cancelado en Stripe`,
    });
    console.log(`🚫 Pago ${pago.id} CANCELADO`);
  }
};

const handleSubscriptionUpdate = async (
  subscription,
  eventType,
  services,
  schema,
  accountability
) => {
  const { ItemsService } = services;
  const suscripcionesService = new ItemsService('suscripciones', { schema, accountability });

  const existing = await suscripcionesService.readByQuery({
    filter: { stripe_subscription_id: { _eq: subscription.id } },
    limit: 1,
  });

  const data = {
    estado: subscription.status,
    fecha_inicio: new Date(subscription.start_date * 1000),
    fecha_fin: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
  };

  if (existing && existing.length > 0) {
    await suscripcionesService.updateOne(existing[0].id, data);
    console.log(
      `✅ Suscripción ${existing[0].id} actualizada: ${subscription.status} (Evento: ${eventType})`
    );

    // Lógica específica por estado
    if (subscription.status === 'paused') {
      console.log(`⏸️ Suscripción ${existing[0].id} ha sido PAUSADA.`);
    } else if (subscription.status === 'canceled') {
      console.log(`🛑 Suscripción ${existing[0].id} ha sido CANCELADA.`);
    } else if (subscription.status === 'past_due') {
      console.log(`⚠️ Suscripción ${existing[0].id} está VENCIDA (Past Due).`);
    }
  } else if (eventType === 'customer.subscription.created') {
    if (
      subscription.metadata &&
      subscription.metadata.venta_id &&
      subscription.metadata.cliente_id
    ) {
      await suscripcionesService.createOne({
        ...data,
        stripe_subscription_id: subscription.id,
        venta_id: subscription.metadata.venta_id,
        cliente_id: subscription.metadata.cliente_id,
        plan_id: subscription.metadata.plan_id,
      });
      console.log(`✅ Suscripción creada desde webhook: ${subscription.id}`);
    } else {
      console.warn(
        `⚠️ Suscripción ${subscription.id} no encontrada y sin metadata suficiente para crear.`
      );
    }
  }
};

const handleInvoicePaymentSucceeded = async (invoice, services, schema, accountability) => {
  if (!invoice.subscription) return;

  const { ItemsService } = services;
  const suscripcionesService = new ItemsService('suscripciones', { schema, accountability });
  const pagosService = new ItemsService('pagos', { schema, accountability });
  const amortizacionesService = new ItemsService('amortizaciones', { schema, accountability });

  const suscripciones = await suscripcionesService.readByQuery({
    filter: { stripe_subscription_id: { _eq: invoice.subscription } },
    limit: 1,
  });

  if (suscripciones && suscripciones.length > 0) {
    const sub = suscripciones[0];

    // 1. Crear el Pago
    const nuevoPagoId = await pagosService.createOne({
      venta_id: sub.venta_id,
      monto: invoice.amount_paid / 100,
      fecha_pago: new Date(invoice.status_transitions.paid_at * 1000),
      estatus: 'pagado',
      metodo_pago: 'tarjeta',
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_customer_id: invoice.customer,
      notas: `Pago automático suscripción ${sub.id} (Factura: ${invoice.number})`,
    });

    console.log(`✅ Pago registrado para suscripción ${sub.id}`);

    // 2. Actualizar Tabla de Amortización
    // Buscar la amortización pendiente más antigua
    const amortizaciones = await amortizacionesService.readByQuery({
      filter: {
        suscripcion_id: { _eq: sub.id },
        estatus: { _eq: 'pendiente' },
      },
      sort: ['fecha_vencimiento'], // Ordenar por fecha vencimiento ascendente
      limit: 1,
    });

    if (amortizaciones && amortizaciones.length > 0) {
      const amortizacion = amortizaciones[0];

      // Validar montos (advertencia si difieren)
      const montoPagado = invoice.amount_paid / 100;
      const montoEsperado = parseFloat(amortizacion.monto_total);
      let notasAdicionales = '';

      if (Math.abs(montoPagado - montoEsperado) > 1.0) {
        console.warn(
          `⚠️ Mismatch en monto pago: Pagado ${montoPagado} vs Esperado ${montoEsperado}`
        );
        notasAdicionales = ` [Warn: Monto difiere de esperado ${montoEsperado}]`;
      }

      // Actualizar amortización
      await amortizacionesService.updateOne(amortizacion.id, {
        estatus: 'pagado',
        pago_id: nuevoPagoId,
        fecha_pago: new Date(), // Fecha real de registro
      });

      // Actualizar notas del pago con referencia a amortización
      await pagosService.updateOne(nuevoPagoId, {
        notas: `Pago automático suscripción ${sub.id} (Factura: ${invoice.number}) - Amortización #${amortizacion.numero_pago}${notasAdicionales}`,
      });

      console.log(`✅ Amortización #${amortizacion.numero_pago} marcada como PAGADA`);
    } else {
      console.warn(
        `⚠️ Pago recibido pero no se encontró amortización pendiente para suscripción ${sub.id}`
      );
    }
  } else {
    console.warn(`⚠️ Invoice ${invoice.id} para suscripción desconocida ${invoice.subscription}`);
  }
};

const handleInvoicePaymentFailed = async (invoice, services, schema, accountability) => {
  if (!invoice.subscription) return;
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  const { ItemsService } = services;
  const suscripcionesService = new ItemsService('suscripciones', { schema, accountability });
  const pagosService = new ItemsService('pagos', { schema, accountability });

  const suscripciones = await suscripcionesService.readByQuery({
    filter: { stripe_subscription_id: { _eq: invoice.subscription } },
    limit: 1,
  });

  if (suscripciones && suscripciones.length > 0) {
    const sub = suscripciones[0];

    // Registrar intento fallido en pagos
    await pagosService.createOne({
      venta_id: sub.venta_id,
      monto: invoice.amount_due / 100,
      fecha_pago: new Date(),
      estatus: 'fallido',
      metodo_pago: 'tarjeta',
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_customer_id: invoice.customer,
      notas: `[Auto] Fallo cobro suscripción. Next attempt: ${invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : 'None'} (Factura: ${invoice.number})`,
    });

    console.log(`📝 Registro de pago fallido creado para venta ${sub.venta_id}`);
    console.log(`📧 [TODO] Enviar notificación a cliente ${sub.cliente_id}: Pago fallido.`);
  } else {
    console.warn(`⚠️ Invoice failed para suscripción desconocida ${invoice.subscription}`);
  }
};

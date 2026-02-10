export async function createPaymentIntent(stripe, services, schema, accountability, body) {
  const { amount, pago_id, cliente_id } = body;

  if (!amount) throw new Error('Amount is required');
  if (!pago_id) throw new Error('Pago ID is required');

  const { ItemsService } = services;
  // Use accountability to enforce permissions, or use admin (null) if we want to bypass checks but manually validate client
  // Requirements say "Test: Crear payment intent con cliente incorrecto -> 403".
  // If we use user accountability, ItemsService.readOne might fail with 403 if user doesn't own the record.
  // That satisfies the requirement implicitly.
  // However, to explicitly check "cliente incorrecto" (e.g. mismatched ID passed in body vs DB), we might want to read it first.
  // Let's use the passed accountability.
  const pagosService = new ItemsService('pagos', { schema, accountability });

  let pago;
  try {
    pago = await pagosService.readOne(pago_id, {
      fields: ['id', 'estatus', 'venta_id', 'venta_id.cliente_id'],
    });
  } catch (err) {
    if (err.status === 403 || err.code === 'FORBIDDEN') {
      const error = new Error('Acceso denegado al pago');
      error.status = 403;
      throw error;
    }
    throw err; // Let 404 propagate or handle it
  }

  if (!pago) {
    const error = new Error('Pago no encontrado');
    error.status = 404;
    throw error;
  }

  // Validate Status
  if (pago.estatus !== 'pendiente' && pago.estatus !== 'atrasado') {
    const error = new Error(`El pago ya ha sido procesado (Estatus: ${pago.estatus})`);
    error.status = 409;
    throw error;
  }

  // Validate Cliente (if provided in body)
  if (cliente_id) {
    // Directus returns nested objects if fields are requested
    const venta = typeof pago.venta_id === 'object' ? pago.venta_id : null;
    const dbClienteId = venta?.cliente_id; // Assuming ID or object depending on schema

    // Normalize IDs to string for comparison
    const normalizedDbId =
      typeof dbClienteId === 'object' ? String(dbClienteId.id) : String(dbClienteId);

    if (normalizedDbId && normalizedDbId !== String(cliente_id)) {
      const error = new Error('El pago no corresponde al cliente indicado');
      error.status = 403;
      throw error;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'mxn',
    metadata: {
      pago_id,
      cliente_id,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Update Pago with Intent ID
  await pagosService.updateOne(pago_id, {
    stripe_payment_intent_id: paymentIntent.id,
    stripe_customer_id: paymentIntent.customer,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export async function confirmPayment(stripe, services, schema, accountability, body) {
  const { payment_intent_id } = body;
  if (!payment_intent_id) throw new Error('Payment Intent ID is required');

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

  if (paymentIntent.status === 'succeeded') {
    // Sync with DB if needed, though webhook is primary
    // Here we can just return the status
  }

  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

export async function getPaymentStatus(stripe, services, schema, accountability, paymentIntentId) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
  };
}

export async function getPaymentHistory(services, schema, accountability, query) {
  const { ItemsService } = services;
  const pagosService = new ItemsService('pagos', { schema, accountability });

  // Ensure user can only see their own payments unless admin
  // This logic is usually handled by Directus permissions if configured,
  // but here we are using ItemsService with accountability, so it should be fine.

  return await pagosService.readByQuery(query);
}

export async function processRefund(stripe, services, schema, accountability, body) {
  const { ItemsService } = services;
  const { payment_intent_id, monto } = body;

  // 1. Validation
  if (!accountability || !accountability.admin) {
    throw new Error('Forbidden: Only admins can process refunds');
  }

  if (!payment_intent_id) {
    throw new Error('Missing required field: payment_intent_id');
  }

  // 2. Retrieve PaymentIntent to check status and amount
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
  } catch (error) {
    console.error('Error retrieving PaymentIntent:', error);
    throw new Error('Invalid PaymentIntent ID');
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Cannot refund payment with status: ${paymentIntent.status}`);
  }

  const refundAmount = monto ? Math.round(monto * 100) : undefined; // Convert to cents if provided

  // 3. Process Refund with Stripe
  let refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: refundAmount,
    });
  } catch (error) {
    console.error('Stripe Refund Error:', error);
    throw new Error(`Stripe Refund Failed: ${error.message}`);
  }

  // 4. Update Database
  const pagosService = new ItemsService('pagos', { schema, accountability });
  const payments = await pagosService.readByQuery({
    filter: { stripe_payment_intent_id: { _eq: payment_intent_id } },
    limit: 1,
  });

  if (payments && payments.length > 0) {
    const payment = payments[0];

    // Append to notes
    const refundNote = `\n[${new Date().toISOString()}] Reembolso procesado: ${refund.amount / 100} ${refund.currency}. Refund ID: ${refund.id}`;

    const updateData = {
      estatus: 'reembolsado',
      notas: (payment.notas || '') + refundNote,
    };

    await pagosService.updateOne(payment.id, updateData);
  }

  return {
    refundId: refund.id,
    amount: refund.amount / 100,
    refundDate: new Date(refund.created * 1000).toISOString(),
    status: refund.status,
  };
}

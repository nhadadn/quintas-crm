export const createSubscription = async (
  { cliente_id, venta_id, plan_id },
  { services, database, getSchema, accountability },
  stripe
) => {
  const { ItemsService } = services;
  const schema = await getSchema();

  const ventasService = new ItemsService('ventas', { schema, accountability });
  const clientesService = new ItemsService('clientes', { schema, accountability });
  const planesService = new ItemsService('planes_pagos', { schema, accountability });
  const suscripcionesService = new ItemsService('suscripciones', { schema, accountability });
  const amortizacionesService = new ItemsService('amortizaciones', { schema, accountability });

  // 1. Validar Venta y Cliente
  const venta = await ventasService.readOne(venta_id);
  if (!venta) throw new Error('Venta no encontrada');
  if (venta.cliente_id !== cliente_id)
    throw new Error('La venta no pertenece al cliente especificado');

  // 2. Validar Plan
  const plan = await planesService.readOne(plan_id);
  if (!plan) throw new Error('Plan de pagos no encontrado');

  // 3. Validar Suscripción Existente
  const existingSubs = await suscripcionesService.readByQuery({
    filter: {
      venta_id: { _eq: venta_id },
      estado: { _in: ['active', 'trialing', 'incomplete'] },
    },
  });

  if (existingSubs.length > 0) {
    throw new Error('Ya existe una suscripción activa para esta venta');
  }

  // 4. Obtener/Crear Cliente Stripe
  const cliente = await clientesService.readOne(cliente_id);
  let stripeCustomerId = cliente.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: cliente.email,
      name: cliente.nombre,
      phone: cliente.telefono,
      metadata: { cliente_id: cliente.id },
    });
    stripeCustomerId = customer.id;

    // Guardar ID en cliente
    await clientesService.updateOne(cliente_id, { stripe_customer_id: stripeCustomerId });
  }

  // 5. Calcular Mensualidad (Amortización)
  // Principal = Total - Enganche
  const principal = parseFloat(venta.monto_total) - parseFloat(venta.enganche);
  if (principal <= 0) throw new Error('El monto total ya está cubierto por el enganche');

  const rate = parseFloat(plan.tasa_interes || 0);
  const n = parseInt(plan.numero_pagos);
  let monthlyPayment = 0;

  if (rate === 0) {
    monthlyPayment = principal / n;
  } else {
    // Fórmula Anualidad Vencida (French)
    // i = tasa anual / 12 / 100
    const i = rate / 100 / 12;
    monthlyPayment = principal * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
  }

  // Round to 2 decimals
  monthlyPayment = Math.round(monthlyPayment * 100) / 100;

  // 6. Crear Stripe Price (Product dinámico o fijo?)
  // Para simplificar y no llenar Stripe de productos, creamos un Price 'inline' o un Producto genérico "Mensualidad Lote X"
  // Stripe Subscriptions requiere un Price ID.
  // Creamos un producto para la venta si no existe, o usamos uno genérico.
  // Mejor: Crear un Price específico para esta suscripción (Recurring).

  const price = await stripe.prices.create({
    currency: 'mxn',
    unit_amount: Math.round(monthlyPayment * 100), // Centavos
    recurring: { interval: 'month' },
    product_data: {
      name: `Mensualidad Lote (Venta #${venta_id})`,
      metadata: { venta_id, plan_id },
    },
  });

  // 7. Crear Subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      venta_id,
      cliente_id,
      plan_id,
    },
  });

  // 8. Guardar en DB
  const suscripcionId = await suscripcionesService.createOne({
    cliente_id,
    venta_id,
    plan_id,
    stripe_subscription_id: subscription.id,
    estado: subscription.status,
    fecha_inicio: new Date(subscription.start_date * 1000),
    fecha_fin: new Date(new Date().setMonth(new Date().getMonth() + n)),
  });

  // 9. Generar Tabla de Amortización (Loop)
  const rows = [];
  let balance = principal;
  const rateMonthly = rate > 0 ? rate / 100 / 12 : 0;
  const startDate = new Date(subscription.start_date * 1000);

  for (let i = 1; i <= n; i++) {
    let interest = rateMonthly > 0 ? balance * rateMonthly : 0;
    let capital = monthlyPayment - interest;

    // Ajuste en el último pago para cerrar saldo
    if (i === n) {
      // Forzamos que el capital cubra exactamente el saldo restante
      // El interés absorbe la diferencia para mantener la cuota fija (o casi fija)
      capital = balance;
      interest = monthlyPayment - capital;

      // Si por redondeo el interés sale negativo (raro), ajustamos
      if (interest < 0) {
        interest = 0;
        capital = monthlyPayment; // El balance quedará con deuda, pero respetamos el cobro
      }
    }

    balance -= capital;
    if (balance < 0) balance = 0;

    // Calcular fecha vencimiento (mes a mes)
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    rows.push({
      suscripcion_id: suscripcionId,
      numero_pago: i,
      fecha_vencimiento: dueDate,
      monto_capital: parseFloat(capital.toFixed(2)),
      monto_interes: parseFloat(interest.toFixed(2)),
      monto_total: parseFloat(monthlyPayment.toFixed(2)),
      estatus: 'pendiente',
    });
  }

  if (rows.length > 0) {
    await amortizacionesService.createMany(rows);
  }

  // 10. Retornar datos para frontend
  const invoice = subscription.latest_invoice;
  const paymentIntent = invoice.payment_intent;

  return {
    subscriptionId: subscription.id,
    clientSecret: paymentIntent.client_secret,
    monthlyPayment: monthlyPayment,
    totalPeriods: n,
    suscripcion_db_id: suscripcionId,
  };
};

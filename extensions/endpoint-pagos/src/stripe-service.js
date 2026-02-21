import Stripe from 'stripe';

let stripe;

const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY no está definida en las variables de entorno');
      throw new Error('Stripe no está configurado');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

export const createPaymentIntent = async (
  amount,
  currency = 'mxn',
  metadata = {},
  customerId = null
) => {
  const stripeInstance = getStripe();
  try {
    const params = {
      amount: Math.round(amount * 100), // Stripe espera centavos
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    };

    if (customerId) {
      params.customer = customerId;
    }

    const paymentIntent = await stripeInstance.paymentIntents.create(params);
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const constructEvent = (payload, signature, secret) => {
  const stripeInstance = getStripe();
  return stripeInstance.webhooks.constructEvent(payload, signature, secret);
};

export const getPaymentIntent = async (id) => {
  const stripeInstance = getStripe();
  return await stripeInstance.paymentIntents.retrieve(id);
};

export const createOrRetrieveCustomer = async (clienteData) => {
  const stripeInstance = getStripe();
  const { email, nombre, id, metadata = {} } = clienteData;

  try {
    // 1. Buscar por email primero
    const existingCustomers = await stripeInstance.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // 2. Si no existe, crear uno nuevo
    const newCustomer = await stripeInstance.customers.create({
      email,
      name: nombre,
      metadata: {
        ...metadata,
        crm_cliente_id: String(id),
      },
    });

    return newCustomer;
  } catch (error) {
    console.error('Error managing Stripe customer:', error);
    throw error;
  }
};

// --- Nuevas Funciones Fase 6.1 ---

export const createProductAndPrice = async (planData) => {
  const stripeInstance = getStripe();
  const product = await stripeInstance.products.create({
    name: planData.nombre,
    description: planData.descripcion,
  });

  const price = await stripeInstance.prices.create({
    unit_amount: Math.round(planData.precio_mensual * 100),
    currency: 'mxn',
    recurring: { interval: 'month', interval_count: 1 },
    product: product.id,
  });

  return { product, price };
};

export const createSubscription = async ({ customerId, priceId, metadata = {} }) => {
  const stripeInstance = getStripe();
  return await stripeInstance.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
};

export const updateSubscription = async (subscriptionId, newPriceId) => {
  const stripeInstance = getStripe();
  const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  return await stripeInstance.subscriptions.update(subscriptionId, {
    items: [{
      id: itemId,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations',
  });
};

export const cancelSubscription = async (subscriptionId, immediate = false) => {
  const stripeInstance = getStripe();
  if (immediate) {
    return await stripeInstance.subscriptions.cancel(subscriptionId);
  } else {
    return await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
};

export const retrieveSubscription = async (subscriptionId) => {
  const stripeInstance = getStripe();
  return await stripeInstance.subscriptions.retrieve(subscriptionId);
};

export const listSubscriptions = async (customerId) => {
  const stripeInstance = getStripe();
  return await stripeInstance.subscriptions.list({
    customer: customerId,
    status: 'all',
  });
};

export const pauseSubscription = async (subscriptionId) => {
  const stripeInstance = getStripe();
  return await stripeInstance.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'mark_uncollectible',
    },
  });
};

export const resumeSubscription = async (subscriptionId) => {
  const stripeInstance = getStripe();
  return await stripeInstance.subscriptions.update(subscriptionId, {
    pause_collection: '',
  });
};

export const createRefund = async ({ paymentIntentId, amount, reason, metadata = {} }) => {
  const stripeInstance = getStripe();
  const params = {
    payment_intent: paymentIntentId,
    metadata,
  };
  if (amount) {
    params.amount = Math.round(amount * 100);
  }
  // Mapear razones comunes de Stripe
  if (reason && ['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason)) {
      params.reason = reason;
  }
  
  return await stripeInstance.refunds.create(params);
};

export const retrieveBalanceTransactions = async (params) => {
    const stripeInstance = getStripe();
    return await stripeInstance.balanceTransactions.list(params);
};

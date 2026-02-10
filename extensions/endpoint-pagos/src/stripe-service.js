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

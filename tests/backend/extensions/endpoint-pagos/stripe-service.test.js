const mockStripeInstance = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    list: jest.fn(),
    create: jest.fn(),
  },
  products: {
    create: jest.fn(),
  },
  prices: {
    create: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  balanceTransactions: {
    list: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
});
jest.mock('../../../../extensions/endpoint-pagos/node_modules/stripe', () => {
  return jest.fn(() => mockStripeInstance);
});

const stripeService = require('../../../../extensions/endpoint-pagos/src/stripe-service.js');

describe('Stripe Service', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    test('should create a payment intent successfully', async () => {
      const mockPaymentIntent = { id: 'pi_123', amount: 1000, currency: 'mxn' };
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(
        10,
        'mxn',
        { orderId: '1' },
        'cus_123'
      );

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'mxn',
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: '1' },
        customer: 'cus_123',
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    test('should handle errors', async () => {
      mockStripeInstance.paymentIntents.create.mockRejectedValue(new Error('Stripe error'));
      await expect(stripeService.createPaymentIntent(10)).rejects.toThrow('Stripe error');
    });
  });

  describe('constructEvent', () => {
    test('should construct event', () => {
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = stripeService.constructEvent('payload', 'sig', 'secret');

      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'sig',
        'secret'
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getPaymentIntent', () => {
    test('should retrieve payment intent', async () => {
      const mockPaymentIntent = { id: 'pi_123' };
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.getPaymentIntent('pi_123');

      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('createOrRetrieveCustomer', () => {
    test('should return existing customer if found', async () => {
      const existingCustomer = { id: 'cus_existing', email: 'test@example.com' };
      mockStripeInstance.customers.list.mockResolvedValue({ data: [existingCustomer] });

      const result = await stripeService.createOrRetrieveCustomer({ email: 'test@example.com' });

      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      });
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingCustomer);
    });

    test('should create new customer if not found', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });
      const newCustomer = { id: 'cus_new', email: 'test@example.com' };
      mockStripeInstance.customers.create.mockResolvedValue(newCustomer);

      const result = await stripeService.createOrRetrieveCustomer({
        email: 'test@example.com',
        nombre: 'Test User',
        id: 'crm_123',
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { crm_cliente_id: 'crm_123' },
      });
      expect(result).toEqual(newCustomer);
    });
  });

  describe('createProductAndPrice', () => {
    test('should create product and price', async () => {
      const mockProduct = { id: 'prod_123' };
      const mockPrice = { id: 'price_123' };
      mockStripeInstance.products.create.mockResolvedValue(mockProduct);
      mockStripeInstance.prices.create.mockResolvedValue(mockPrice);

      const result = await stripeService.createProductAndPrice({
        nombre: 'Plan A',
        descripcion: 'Desc',
        precio_mensual: 100,
      });

      expect(mockStripeInstance.products.create).toHaveBeenCalledWith({
        name: 'Plan A',
        description: 'Desc',
      });
      expect(mockStripeInstance.prices.create).toHaveBeenCalledWith({
        unit_amount: 10000,
        currency: 'mxn',
        recurring: { interval: 'month', interval_count: 1 },
        product: 'prod_123',
      });
      expect(result).toEqual({ product: mockProduct, price: mockPrice });
    });
  });

  describe('createSubscription', () => {
    test('should create subscription', async () => {
      const mockSub = { id: 'sub_123' };
      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSub);

      const result = await stripeService.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123',
        metadata: { meta: 'data' },
      });

      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          items: [{ price: 'price_123' }],
          metadata: { meta: 'data' },
        })
      );
      expect(result).toEqual(mockSub);
    });
  });

  describe('updateSubscription', () => {
    test('should update subscription plan', async () => {
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      });
      mockStripeInstance.subscriptions.update.mockResolvedValue({ id: 'sub_123', updated: true });

      const result = await stripeService.updateSubscription('sub_123', 'new_price_123');

      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        items: [{ id: 'si_123', price: 'new_price_123' }],
        proration_behavior: 'create_prorations',
      });
      expect(result).toEqual({ id: 'sub_123', updated: true });
    });
  });

  describe('cancelSubscription', () => {
    test('should cancel immediately', async () => {
      mockStripeInstance.subscriptions.cancel.mockResolvedValue({ status: 'canceled' });
      const result = await stripeService.cancelSubscription('sub_123', true);
      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      expect(result).toEqual({ status: 'canceled' });
    });

    test('should cancel at period end', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({ cancel_at_period_end: true });
      const result = await stripeService.cancelSubscription('sub_123', false);
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
      expect(result).toEqual({ cancel_at_period_end: true });
    });
  });

  describe('retrieveSubscription', () => {
    test('should retrieve subscription', async () => {
      const mockSub = { id: 'sub_123' };
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSub);
      const result = await stripeService.retrieveSubscription('sub_123');
      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
      expect(result).toEqual(mockSub);
    });
  });

  describe('listSubscriptions', () => {
    test('should list subscriptions for customer', async () => {
      const mockList = { data: [] };
      mockStripeInstance.subscriptions.list.mockResolvedValue(mockList);
      const result = await stripeService.listSubscriptions('cus_123');
      expect(mockStripeInstance.subscriptions.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        status: 'all',
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('pauseSubscription', () => {
    test('should pause subscription', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        pause_collection: {},
      });
      await stripeService.pauseSubscription('sub_123');
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
    });
  });

  describe('resumeSubscription', () => {
    test('should resume subscription', async () => {
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        pause_collection: null,
      });
      await stripeService.resumeSubscription('sub_123');
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        pause_collection: '',
      });
    });
  });

  describe('createRefund', () => {
    test('should create refund', async () => {
      mockStripeInstance.refunds.create.mockResolvedValue({ id: 're_123' });
      await stripeService.createRefund({
        paymentIntentId: 'pi_123',
        amount: 50,
        reason: 'duplicate',
      });
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 5000,
        reason: 'duplicate',
        metadata: {},
      });
    });
  });

  describe('retrieveBalanceTransactions', () => {
    test('should list balance transactions', async () => {
      mockStripeInstance.balanceTransactions.list.mockResolvedValue({ data: [] });
      await stripeService.retrieveBalanceTransactions({ limit: 10 });
      expect(mockStripeInstance.balanceTransactions.list).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});

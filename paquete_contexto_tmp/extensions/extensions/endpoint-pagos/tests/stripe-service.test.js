import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as stripeService from '../src/stripe-service.js';
import Stripe from 'stripe';

// Mock Stripe class
vi.mock('stripe', () => {
  const paymentIntents = {
    create: vi.fn(),
    retrieve: vi.fn(),
  };

  const customers = {
    list: vi.fn(),
    create: vi.fn(),
  };

  const webhooks = {
    constructEvent: vi.fn(),
  };

  const products = {
    create: vi.fn(),
  };

  const prices = {
    create: vi.fn(),
  };

  const subscriptions = {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
  };

  const refunds = {
    create: vi.fn(),
  };

  const balanceTransactions = {
    list: vi.fn(),
  };

  // Return a mock constructor
  return {
    default: vi.fn(function () {
      return {
        paymentIntents,
        webhooks,
        customers,
        products,
        prices,
        subscriptions,
        refunds,
        balanceTransactions,
      };
    }),
  };
});

describe('Stripe Service', () => {
  let stripeMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_key';

    // Create a fresh instance of the mock to access the spies
    stripeMock = new Stripe();

    // Reset module state if possible, or just ensure we don't rely on cached internal state
    // Note: stripe-service.js caches the instance.
    // If we want to test initialization logic, we'd need to use dynamic imports.
    // For now, we assume the instance is reused and our mock setup works because the spies are shared.
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('createPaymentIntent', () => {
    it('creates a payment intent with correct parameters', async () => {
      const mockPaymentIntent = { id: 'pi_123', amount: 50000, currency: 'mxn' };
      stripeMock.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(500, 'mxn');

      expect(result).toEqual(mockPaymentIntent);
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          currency: 'mxn',
          automatic_payment_methods: { enabled: true },
        })
      );
    });

    it('creates a payment intent with customerId', async () => {
      const mockPaymentIntent = { id: 'pi_123', amount: 50000, currency: 'mxn' };
      stripeMock.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await stripeService.createPaymentIntent(500, 'mxn', {}, 'cus_123');

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
        })
      );
    });

    it('handles errors', async () => {
      const error = new Error('Stripe error');
      stripeMock.paymentIntents.create.mockRejectedValue(error);

      await expect(stripeService.createPaymentIntent(500)).rejects.toThrow('Stripe error');
    });
  });

  describe('constructEvent', () => {
    it('calls stripe.webhooks.constructEvent', () => {
      const payload = '{}';
      const signature = 'sig';
      const secret = 'whsec_';
      const mockEvent = { id: 'evt_123' };
      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = stripeService.constructEvent(payload, signature, secret);

      expect(result).toEqual(mockEvent);
      expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(payload, signature, secret);
    });
  });

  describe('getPaymentIntent', () => {
    it('retrieves a payment intent', async () => {
      const mockPI = { id: 'pi_123' };
      stripeMock.paymentIntents.retrieve.mockResolvedValue(mockPI);

      const result = await stripeService.getPaymentIntent('pi_123');
      expect(result).toEqual(mockPI);
      expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
    });
  });

  describe('createOrRetrieveCustomer', () => {
    it('returns existing customer if found', async () => {
      const existingCustomer = { id: 'cus_123', email: 'test@example.com' };
      stripeMock.customers.list.mockResolvedValue({ data: [existingCustomer] });

      const result = await stripeService.createOrRetrieveCustomer({
        email: 'test@example.com',
        nombre: 'Test User',
        id: 1,
      });

      expect(result).toEqual(existingCustomer);
      expect(stripeMock.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      });
      expect(stripeMock.customers.create).not.toHaveBeenCalled();
    });

    it('creates new customer if not found', async () => {
      stripeMock.customers.list.mockResolvedValue({ data: [] });
      const newCustomer = { id: 'cus_new', email: 'test@example.com' };
      stripeMock.customers.create.mockResolvedValue(newCustomer);

      const result = await stripeService.createOrRetrieveCustomer({
        email: 'test@example.com',
        nombre: 'Test User',
        id: 1,
      });

      expect(result).toEqual(newCustomer);
      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          crm_cliente_id: '1',
        },
      });
    });
    it('handles errors when creating/retrieving customer', async () => {
      stripeMock.customers.list.mockRejectedValue(new Error('Stripe error'));

      await expect(
        stripeService.createOrRetrieveCustomer({
          email: 'test@example.com',
          nombre: 'Test User',
          id: 1,
        })
      ).rejects.toThrow('Stripe error');
    });
  });

  describe('Subscription Management', () => {
    it('createProductAndPrice creates product and price', async () => {
      stripeMock.products.create.mockResolvedValue({ id: 'prod_123' });
      stripeMock.prices.create.mockResolvedValue({ id: 'price_123' });

      const result = await stripeService.createProductAndPrice({
        nombre: 'Plan A',
        descripcion: 'Desc',
        precio_mensual: 100,
      });

      expect(result.product).toEqual({ id: 'prod_123' });
      expect(result.price).toEqual({ id: 'price_123' });
      expect(stripeMock.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_amount: 10000,
          recurring: { interval: 'month', interval_count: 1 },
        })
      );
    });

    it('createSubscription creates subscription', async () => {
      stripeMock.subscriptions.create.mockResolvedValue({ id: 'sub_123' });

      await stripeService.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123',
      });

      expect(stripeMock.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          items: [{ price: 'price_123' }],
        })
      );
    });

    it('updateSubscription updates items', async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        items: { data: [{ id: 'si_123' }] },
      });
      stripeMock.subscriptions.update.mockResolvedValue({ id: 'sub_123' });

      await stripeService.updateSubscription('sub_123', 'price_new');

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [{ id: 'si_123', price: 'price_new' }],
        })
      );
    });

    it('cancelSubscription cancels immediately if flag set', async () => {
      await stripeService.cancelSubscription('sub_123', true);
      expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('cancelSubscription updates to cancel at period end', async () => {
      await stripeService.cancelSubscription('sub_123', false);
      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('retrieveSubscription calls retrieve', async () => {
      await stripeService.retrieveSubscription('sub_123');
      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    });

    it('listSubscriptions calls list', async () => {
      await stripeService.listSubscriptions('cus_123');
      expect(stripeMock.subscriptions.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        status: 'all',
      });
    });

    it('pauseSubscription marks uncollectible', async () => {
      await stripeService.pauseSubscription('sub_123');
      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
    });

    it('resumeSubscription removes pause_collection', async () => {
      await stripeService.resumeSubscription('sub_123');
      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        pause_collection: '',
      });
    });
  });

  describe('createRefund', () => {
    it('creates refund with basic params', async () => {
      stripeMock.refunds.create.mockResolvedValue({ id: 're_123' });

      await stripeService.createRefund({
        paymentIntentId: 'pi_123',
        amount: 100,
        metadata: { reason: 'test' },
      });

      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 10000,
        metadata: { reason: 'test' },
      });
    });

    it('adds specific reason if valid', async () => {
      await stripeService.createRefund({
        paymentIntentId: 'pi_123',
        reason: 'duplicate',
      });

      expect(stripeMock.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'duplicate',
        })
      );
    });

    it('ignores invalid reasons', async () => {
      await stripeService.createRefund({
        paymentIntentId: 'pi_123',
        reason: 'invalid_reason',
      });

      expect(stripeMock.refunds.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          reason: 'invalid_reason',
        })
      );
    });
  });

  describe('retrieveBalanceTransactions', () => {
    it('lists balance transactions', async () => {
      const params = { limit: 10 };
      await stripeService.retrieveBalanceTransactions(params);
      expect(stripeMock.balanceTransactions.list).toHaveBeenCalledWith(params);
    });
  });
});

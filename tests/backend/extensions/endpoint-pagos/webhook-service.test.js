import { jest } from '@jest/globals';
import { WebhookService } from '../../../../extensions/endpoint-pagos/src/webhook-service.js';
import * as stripeService from '../../../../extensions/endpoint-pagos/src/stripe-service.js';

// Mock stripe-service.js
jest.mock('../../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  constructEvent: jest.fn(),
}));

describe('WebhookService', () => {
  let webhookService;
  let mockServices;
  let mockDatabase;
  let mockGetSchema;
  let mockItemsService;
  let mockMailService;
  let mockLogsService;
  let mockPagosService;
  let mockSuscripcionesService;
  let mockReembolsosService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogsService = {
      createOne: jest.fn().mockResolvedValue(1),
      updateOne: jest.fn().mockResolvedValue(1),
      readByQuery: jest.fn().mockResolvedValue([]), // Default: processed false
    };

    mockPagosService = {
      readByQuery: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({}),
      createOne: jest.fn().mockResolvedValue({ id: 100 }), // Added createOne
    };

    mockSuscripcionesService = {
      readByQuery: jest.fn().mockResolvedValue([]),
      createOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
    };

    mockReembolsosService = {
      readByQuery: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({}),
    };

    // Dynamic mockItemsService to return different mocks based on collection
    mockItemsService = jest.fn((collection) => {
      switch (collection) {
        case 'webhook_logs':
          return mockLogsService;
        case 'pagos':
          return mockPagosService;
        case 'suscripciones':
          return mockSuscripcionesService;
        case 'reembolsos':
          return mockReembolsosService;
        default:
          return { readByQuery: jest.fn(), updateOne: jest.fn(), createOne: jest.fn() };
      }
    });

    mockMailService = {
      send: jest.fn(),
    };

    mockServices = {
      ItemsService: mockItemsService,
      MailService: jest.fn(() => mockMailService),
    };

    const dbChain = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      transaction: jest.fn(async (fn) => fn(dbChain)),
      raw: jest.fn((s) => s),
    };
    mockDatabase = jest.fn(() => dbChain);
    mockGetSchema = jest.fn().mockResolvedValue({});

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    webhookService = new WebhookService({
      services: mockServices,
      database: mockDatabase,
      getSchema: mockGetSchema,
    });
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('handleEvent', () => {
    test('should process valid event successfully', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      const payload = Buffer.from('payload');
      const signature = 'sig';
      const event = { id: 'evt_123', type: 'test.event', data: { object: {} } };

      stripeService.constructEvent.mockReturnValue(event);

      // Mock isEventProcessed false
      mockLogsService.readByQuery.mockResolvedValueOnce([]);

      // Spy processEvent (if we want to isolate handleEvent logic)
      // But we can let it run to verify switch default case
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await webhookService.handleEvent(payload, signature);

      expect(stripeService.constructEvent).toHaveBeenCalledWith(payload, signature, 'whsec_test');
      expect(mockLogsService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_event_id: 'evt_123',
          estado: 'pendiente',
        })
      );
      expect(mockLogsService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'procesado',
        })
      );
      expect(result).toEqual({ received: true });

      consoleSpy.mockRestore();
    });

    test('should throw error if signature verification fails', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      stripeService.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(webhookService.handleEvent('payload', 'sig')).rejects.toThrow(
        'Webhook Error: Invalid signature'
      );

      consoleSpy.mockRestore();
    });

    test('should handle insecure mode if secret not set', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const payload = { id: 'evt_123', type: 'test.event', data: { object: {} } };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await webhookService.handleEvent(payload, null);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('STRIPE_WEBHOOK_SECRET not set')
      );
      expect(mockLogsService.createOne).toHaveBeenCalled(); // Should proceed

      consoleSpy.mockRestore();
    });

    test('should skip processed events (idempotency)', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      stripeService.constructEvent.mockReturnValue({ id: 'evt_123', type: 'test', data: {} });

      // Mock isEventProcessed true
      mockLogsService.readByQuery.mockResolvedValueOnce([{ id: 99 }]);

      const result = await webhookService.handleEvent('payload', 'sig');

      expect(result).toEqual({ received: true });
      expect(mockLogsService.createOne).not.toHaveBeenCalled();
    });

    test('should log failure if processing throws', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      stripeService.constructEvent.mockReturnValue({
        id: 'evt_123',
        type: 'test.fail',
        data: { object: {} },
      });

      // Force processEvent to throw
      jest.spyOn(webhookService, 'processEvent').mockRejectedValue(new Error('Processing failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(webhookService.handleEvent('payload', 'sig')).rejects.toThrow(
        'Processing failed'
      );

      expect(mockLogsService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'fallido',
          error_mensaje: 'Processing failed',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('handlePaymentIntentSucceeded', () => {
    test('should mark payment as paid', async () => {
      const paymentIntent = {
        id: 'pi_123',
        charges: { data: [{ payment_method_details: { card: { last4: '4242' } } }] },
      };
      const schema = {};

      // Mock existing payment
      mockPagosService.readByQuery.mockResolvedValue([
        { id: 10, estatus: 'pendiente', monto: 100 },
      ]);

      await webhookService.handlePaymentIntentSucceeded(paymentIntent, schema);

      expect(mockPagosService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { stripe_payment_intent_id: { _eq: 'pi_123' } },
        })
      );
      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          estatus: 'pagado',
          stripe_last4: '4242',
          monto_pagado: 100,
        })
      );
    });

    test('should ignore if payment not found', async () => {
      mockPagosService.readByQuery.mockResolvedValue([]);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await webhookService.handlePaymentIntentSucceeded({ id: 'pi_123' }, {});

      expect(mockPagosService.updateOne).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should ignore if payment already paid', async () => {
      mockPagosService.readByQuery.mockResolvedValue([{ id: 10, estatus: 'pagado' }]);

      await webhookService.handlePaymentIntentSucceeded({ id: 'pi_123' }, {});

      expect(mockPagosService.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentIntentFailed', () => {
    test('should log failure note on payment', async () => {
      const paymentIntent = {
        id: 'pi_123',
        last_payment_error: { message: 'Card declined' },
      };

      mockPagosService.readByQuery.mockResolvedValue([{ id: 10, notas: 'Previous note' }]);

      await webhookService.handlePaymentIntentFailed(paymentIntent, {});

      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          notas: expect.stringContaining('Card declined'),
        })
      );
      // Ensure it preserves previous note
      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          notas: expect.stringContaining('Previous note'),
        })
      );
    });
  });

  describe('handleSubscriptionCreated', () => {
    test('should create subscription record', async () => {
      const stripeSub = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1672531200,
        current_period_end: 1675209600,
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_123', unit_amount: 1000 } }] },
        metadata: { venta_id: 1, plan_id: 2 },
      };

      mockSuscripcionesService.readByQuery.mockResolvedValue([]); // No existing sub

      // Mock user lookup
      const mockUsersService = {
        readByQuery: jest.fn().mockResolvedValue([{ id: 1 }]),
        updateOne: jest.fn().mockResolvedValue({}), // Added updateOne
      };
      mockItemsService.mockImplementation((collection) => {
        if (collection === 'directus_users') return mockUsersService;
        if (collection === 'suscripciones') return mockSuscripcionesService;
        return { readByQuery: jest.fn() };
      });

      // Mock mailService.send
      webhookService.sendEmail = jest.fn(); // Mock helper method directly or mailService

      await webhookService.handleSubscriptionCreated(stripeSub, {});

      expect(mockSuscripcionesService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_subscription_id: 'sub_123',
          estado: 'active',
          plan_id: 'price_123', // Note: Code maps price.id to plan_id directly in handleSubscriptionCreated line 228?
          // Actually line 228: plan_id: stripeSub.items.data[0]?.price.id
          // Ideally it should map to local plan ID, but webhook logic seems to use price ID or expects metadata.
          // Let's check code logic later.
        })
      );
    });
  });

  describe('handleInvoicePaymentSucceeded', () => {
    test('should create payment record from invoice', async () => {
      const invoice = {
        id: 'in_123',
        amount_paid: 1000,
        currency: 'mxn',
        status: 'paid',
        subscription: 'sub_123',
        payment_intent: 'pi_123',
        customer: 'cus_123',
        customer_email: 'test@test.com',
        created: 1672531200, // Added timestamp
      };

      // Mock finding subscription
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, cliente_id: 10 }]);

      // Mock finding payment (idempotency)
      mockPagosService.readByQuery.mockResolvedValue([]);

      await webhookService.handleInvoicePaymentSucceeded(invoice, {});

      expect(mockPagosService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          monto: 10, // 1000 / 100
          referencia: 'pi_123',
          stripe_invoice_id: 'in_123',
        })
      );
    });
  });

  describe('handleSubscriptionUpdated', () => {
    test('should update subscription status', async () => {
      const stripeSub = {
        id: 'sub_123',
        status: 'past_due',
        current_period_end: 1675209600,
        items: { data: [{ price: { id: 'price_new' } }] },
      };

      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, plan_id: 'price_old' }]);

      await webhookService.handleSubscriptionUpdated(
        stripeSub,
        {},
        'customer.subscription.updated'
      );

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'past_due',
          plan_id: 'price_new',
        })
      );
    });
  });

  describe('handleSubscriptionDeleted', () => {
    test('should cancel subscription and user status', async () => {
      const stripeSub = { id: 'sub_123' };

      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, user_id: 100 }]);
      const mockUsersService = { updateOne: jest.fn().mockResolvedValue({}) };
      mockItemsService.mockImplementation((collection) => {
        if (collection === 'directus_users') return mockUsersService;
        if (collection === 'suscripciones') return mockSuscripcionesService;
        return { readByQuery: jest.fn() };
      });

      // Mock sendEmail
      webhookService.sendEmail = jest.fn();

      await webhookService.handleSubscriptionDeleted(stripeSub, {});

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'canceled',
        })
      );
      expect(mockUsersService.updateOne).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          estado_suscripcion: 'inactive',
        })
      );
      expect(webhookService.sendEmail).toHaveBeenCalledWith(
        100,
        expect.stringContaining('Cancelación'),
        expect.any(String),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    test('should notify user of failed payment', async () => {
      const invoice = {
        id: 'in_123',
        customer: 'cus_123',
        amount_due: 2000,
        hosted_invoice_url: 'https://stripe.com/invoice/123',
      };

      // Mock findUserIdByStripeCustomer
      webhookService.findUserIdByStripeCustomer = jest.fn().mockResolvedValue(100);
      webhookService.sendEmail = jest.fn();

      await webhookService.handleInvoicePaymentFailed(invoice, {});

      expect(webhookService.sendEmail).toHaveBeenCalledWith(
        100,
        'Pago de suscripción fallido',
        'payment_failed',
        expect.objectContaining({
          amount: '20.00',
        }),
        expect.any(Object)
      );
    });
  });

  describe('handleRefundEvent', () => {
    test('should update existing refund status', async () => {
      const refund = { id: 're_123', status: 'succeeded', created: 1672531200 };
      const eventObj = { object: 'refund', ...refund };

      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await webhookService.handleRefundEvent(eventObj, {}, 'charge.refund.updated');

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'succeeded',
        })
      );
    });

    test('should handle charge.refunded event', async () => {
      const refund = { id: 're_123', status: 'succeeded', created: 1672531200 };
      const charge = { object: 'charge', refunds: { data: [refund] } };

      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await webhookService.handleRefundEvent(charge, {}, 'charge.refunded');

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'succeeded',
        })
      );
    });
  });

  describe('handleRefundFailed', () => {
    test('should update refund status to failed', async () => {
      const refund = { id: 're_123', failure_reason: 'expired' };

      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await webhookService.handleRefundFailed(refund, {});

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'failed',
          notas: expect.stringContaining('expired'),
        })
      );
    });
  });

  describe('sendEmail', () => {
    test('should send email using MailService', async () => {
      const mockUsersService = {
        readOne: jest.fn().mockResolvedValue({ email: 'test@test.com', first_name: 'Test' }),
      };
      mockItemsService.mockImplementation((col) =>
        col === 'directus_users' ? mockUsersService : {}
      );

      // We need to restore original sendEmail if it was mocked in other tests or use the real method logic
      // Since we mocked webhookService methods in other tests (e.g. handleSubscriptionDeleted), we should check if we can test the real one.
      // In previous tests I did `webhookService.sendEmail = jest.fn()`.
      // Here I want to test the real implementation.
      // But `webhookService` is re-created in `beforeEach`.
      // So it should be fresh.

      await webhookService.sendEmail(1, 'Subject', 'tpl', { foo: 'bar' }, {});

      expect(mockUsersService.readOne).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@test.com',
          subject: 'Subject',
          html: expect.stringContaining('Hola Test'),
        })
      );
    });
  });

  describe('error handling', () => {
    test('should catch error when log creation fails', async () => {
      mockLogsService.createOne.mockRejectedValue(new Error('Log Creation Error'));
      // Should not throw, but log warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = {
        id: 'evt_test_log_fail',
        type: 'test.event',
        data: { object: {} },
      };

      const result = await webhookService.handleEvent(event);
      expect(result).toEqual({ received: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Could not create webhook log:',
        'Log Creation Error'
      );
      consoleSpy.mockRestore();
    });

    test('should catch error in sendEmail', async () => {
      mockMailService.send.mockRejectedValue(new Error('Mail Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockUsersService = {
        readOne: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com', first_name: 'Test' }),
      };

      // Temporarily override mockItemsService behavior for this test or just update the main mock if possible,
      // but mockItemsService is a jest function so we can modify implementation.
      webhookService.itemsService = jest.fn((collection) => {
        if (collection === 'directus_users') return mockUsersService;
        return mockLogsService;
      });

      await webhookService.sendEmail(1, 'Subject', 'template', {}, {});

      expect(consoleSpy).toHaveBeenCalledWith('Error sending email:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('processEvent switch cases', () => {
    test('should handle customer.subscription.paused', async () => {
      const spy = jest.spyOn(webhookService, 'handleSubscriptionUpdated').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'customer.subscription.paused', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle customer.subscription.resumed', async () => {
      const spy = jest.spyOn(webhookService, 'handleSubscriptionUpdated').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'customer.subscription.resumed', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle invoice.payment_action_required', async () => {
      const spy = jest.spyOn(webhookService, 'notifyUserActionRequired').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'invoice.payment_action_required', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle charge.refund.updated', async () => {
      const spy = jest.spyOn(webhookService, 'handleRefundEvent').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'charge.refund.updated', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle customer.subscription.created', async () => {
      const spy = jest.spyOn(webhookService, 'handleSubscriptionCreated').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'customer.subscription.created', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle customer.subscription.deleted', async () => {
      const spy = jest.spyOn(webhookService, 'handleSubscriptionDeleted').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'customer.subscription.deleted', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle invoice.payment_succeeded', async () => {
      const spy = jest.spyOn(webhookService, 'handleInvoicePaymentSucceeded').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'invoice.payment_succeeded', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle invoice.payment_failed', async () => {
      const spy = jest.spyOn(webhookService, 'handleInvoicePaymentFailed').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'invoice.payment_failed', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle charge.refund.failed', async () => {
      const spy = jest.spyOn(webhookService, 'handleRefundFailed').mockResolvedValue();
      await webhookService.processEvent({ type: 'charge.refund.failed', data: { object: {} } }, {});
      expect(spy).toHaveBeenCalled();
    });

    test('should handle payment_intent.succeeded', async () => {
      const spy = jest.spyOn(webhookService, 'handlePaymentIntentSucceeded').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'payment_intent.succeeded', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle charge.refund.succeeded', async () => {
      const spy = jest.spyOn(webhookService, 'handleRefundEvent').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'charge.refund.succeeded', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should handle payment_intent.payment_failed', async () => {
      const spy = jest.spyOn(webhookService, 'handlePaymentIntentFailed').mockResolvedValue();
      await webhookService.processEvent(
        { type: 'payment_intent.payment_failed', data: { object: {} } },
        {}
      );
      expect(spy).toHaveBeenCalled();
    });

    test('should log unhandled event type', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await webhookService.processEvent({ type: 'unknown.event', data: { object: {} } }, {});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled event type'));
      consoleSpy.mockRestore();
    });
  });
});

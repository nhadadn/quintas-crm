import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../src/webhook-service.js';
import * as stripeService from '../src/stripe-service.js';

vi.mock('../src/stripe-service.js', () => ({
  constructEvent: vi.fn((payload) => payload),
}));

describe('WebhookService', () => {
  let service;
  let mockItemsService;
  let mockMailService;
  let mockServices;

  // Mock collection services
  let mockPagosService;
  let mockSuscripcionesService;
  let mockUsersService;
  let mockReembolsosService;
  let mockLogsService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    mockPagosService = {
      readByQuery: vi.fn(),
      updateOne: vi.fn(),
      createOne: vi.fn(),
    };
    mockSuscripcionesService = {
      readByQuery: vi.fn(),
      createOne: vi.fn(),
      updateOne: vi.fn(),
    };
    mockUsersService = {
      readByQuery: vi.fn(),
      readOne: vi.fn(),
      updateOne: vi.fn(),
    };
    mockReembolsosService = {
      readByQuery: vi.fn(),
      updateOne: vi.fn(),
    };
    mockLogsService = {
      readByQuery: vi.fn(),
      createOne: vi.fn().mockResolvedValue(1),
      updateOne: vi.fn(),
    };

    mockItemsService = vi.fn(function (collection) {
      if (collection === 'pagos') return mockPagosService;
      if (collection === 'suscripciones') return mockSuscripcionesService;
      if (collection === 'directus_users') return mockUsersService;
      if (collection === 'reembolsos') return mockReembolsosService;
      if (collection === 'webhook_logs') return mockLogsService;
      return {};
    });

    mockMailService = {
      send: vi.fn().mockResolvedValue(true),
    };

    mockServices = {
      ItemsService: mockItemsService,
      MailService: vi.fn(function () {
        return mockMailService;
      }),
    };

    service = new WebhookService({
      services: mockServices,
      database: {},
      getSchema: vi.fn().mockResolvedValue({}),
    });
  });

  describe('handleEvent', () => {
    it('verifies signature successfully', async () => {
      const payload = { id: 'evt_1', type: 'test', data: { object: {} } };
      stripeService.constructEvent.mockReturnValue(payload);
      mockLogsService.readByQuery.mockResolvedValue([]); // Not processed

      await service.handleEvent(payload, 'sig');

      expect(stripeService.constructEvent).toHaveBeenCalledWith(payload, 'sig', 'whsec_test');
      expect(mockLogsService.createOne).toHaveBeenCalled();
      expect(mockLogsService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'procesado' })
      );
    });

    it('throws if signature verification fails', async () => {
      stripeService.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      await expect(service.handleEvent({}, 'sig')).rejects.toThrow(
        'Webhook Error: Invalid signature'
      );
    });

    it('skips processing if already processed', async () => {
      const payload = { id: 'evt_1', type: 'test', data: { object: {} } };
      stripeService.constructEvent.mockReturnValue(payload);
      mockLogsService.readByQuery.mockResolvedValue([{ id: 1 }]); // Processed

      const result = await service.handleEvent(payload, 'sig');
      expect(result).toEqual({ received: true });
      expect(mockLogsService.createOne).not.toHaveBeenCalled();
    });

    it('handles processing error and logs failure', async () => {
      const payload = { id: 'evt_1', type: 'payment_intent.succeeded', data: { object: {} } };
      stripeService.constructEvent.mockReturnValue(payload);
      mockLogsService.readByQuery.mockResolvedValue([]);

      // Mock handler failure
      mockPagosService.readByQuery.mockRejectedValue(new Error('DB Error'));

      await expect(service.handleEvent(payload, 'sig')).rejects.toThrow('DB Error');
      expect(mockLogsService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'fallido' })
      );
    });

    it('processes insecurely if no secret set', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const payload = { id: 'evt_1', type: 'test', data: { object: {} } };
      mockLogsService.readByQuery.mockResolvedValue([]);

      await service.handleEvent(payload, 'sig');
      expect(mockLogsService.createOne).toHaveBeenCalled();
    });

    it('handles log creation failure gracefully', async () => {
      const payload = { id: 'evt_1', type: 'test', data: { object: {} } };
      stripeService.constructEvent.mockReturnValue(payload);
      mockLogsService.readByQuery.mockResolvedValue([]);
      mockLogsService.createOne.mockRejectedValue(new Error('Log Error'));

      // Should still process event
      const result = await service.handleEvent(payload, 'sig');
      expect(result).toEqual({ received: true });
      expect(mockLogsService.createOne).toHaveBeenCalled();
      expect(mockLogsService.updateOne).not.toHaveBeenCalled();
    });

    it('handles log creation failure AND processing failure', async () => {
      const payload = {
        id: 'evt_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      };
      stripeService.constructEvent.mockReturnValue(payload);
      mockLogsService.readByQuery.mockResolvedValue([]);
      mockLogsService.createOne.mockRejectedValue(new Error('Log Error'));

      // Mock handler failure
      mockPagosService.readByQuery.mockRejectedValue(new Error('DB Error'));

      await expect(service.handleEvent(payload, 'sig')).rejects.toThrow('DB Error');
      expect(mockLogsService.updateOne).not.toHaveBeenCalled(); // logId is undefined
    });
  });

  describe('Handlers', () => {
    // payment_intent.succeeded
    it('handlePaymentIntentSucceeded updates payment', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1',
            charges: { data: [{ payment_method_details: { card: { last4: '4242' } } }] },
          },
        },
      };
      mockPagosService.readByQuery.mockResolvedValue([{ id: 1, monto: 100, estatus: 'pendiente' }]);

      await service.processEvent(event, {});

      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estatus: 'pagado', stripe_last4: '4242' })
      );
    });

    it('handlePaymentIntentSucceeded handles missing card details', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1', charges: { data: [] } } },
      };
      mockPagosService.readByQuery.mockResolvedValue([{ id: 1, monto: 100, estatus: 'pendiente' }]);

      await service.processEvent(event, {});

      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estatus: 'pagado', stripe_last4: null })
      );
    });

    it('handlePaymentIntentSucceeded ignores if not found', async () => {
      const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } };
      mockPagosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockPagosService.updateOne).not.toHaveBeenCalled();
    });

    it('handlePaymentIntentSucceeded ignores if already paid', async () => {
      const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } };
      mockPagosService.readByQuery.mockResolvedValue([{ id: 1, estatus: 'pagado' }]);

      await service.processEvent(event, {});
      expect(mockPagosService.updateOne).not.toHaveBeenCalled();
    });

    // payment_intent.payment_failed
    it('handlePaymentIntentFailed updates payment notes', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_1', last_payment_error: { message: 'Decline' } } },
      };
      mockPagosService.readByQuery.mockResolvedValue([{ id: 1, notas: '' }]);

      await service.processEvent(event, {});

      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ notas: expect.stringContaining('Decline') })
      );
    });

    it('handlePaymentIntentFailed ignores if not found', async () => {
      const event = { type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1' } } };
      mockPagosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockPagosService.updateOne).not.toHaveBeenCalled();
    });

    it('handlePaymentIntentFailed handles default error message', async () => {
      const event = { type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1' } } }; // No last_payment_error
      mockPagosService.readByQuery.mockResolvedValue([{ id: 1, notas: '' }]);

      await service.processEvent(event, {});
      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ notas: expect.stringContaining('Error desconocido') })
      );
    });

    // customer.subscription.created
    it('handleSubscriptionCreated creates subscription and links user', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            current_period_start: 100,
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1', unit_amount: 1000 } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      mockUsersService.readByQuery.mockResolvedValue([
        { id: 'user_1', email: 'test@test.com', first_name: 'Test' },
      ]);
      mockUsersService.readOne.mockResolvedValue({
        id: 'user_1',
        email: 'test@test.com',
        first_name: 'Test',
      });

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_subscription_id: 'sub_1',
          user_id: 'user_1',
        })
      );
      expect(mockUsersService.updateOne).toHaveBeenCalledWith('user_1', {
        estado_suscripcion: 'active_subscriber',
      });
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('handleSubscriptionCreated uses metadata user id', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            metadata: { crm_user_id: 'user_meta' },
            current_period_start: 100,
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1', unit_amount: 1000 } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      mockUsersService.readOne.mockResolvedValue({ id: 'user_meta', email: 'test@test.com' });

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_meta',
        })
      );
      // verify we didn't query by stripe customer id if metadata was present
      expect(mockUsersService.readByQuery).not.toHaveBeenCalled();
    });

    it('handleSubscriptionCreated creates subscription without user if not found', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_1',
            current_period_start: 100,
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1', unit_amount: 1000 } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      mockUsersService.readByQuery.mockResolvedValue([]); // User not found

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_subscription_id: 'sub_1',
        })
      );
      // Verify createOne argument does NOT have user_id
      const createCall = mockSuscripcionesService.createOne.mock.calls[0][0];
      expect(createCall).not.toHaveProperty('user_id');
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('handleSubscriptionCreated skips if already exists', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            items: { data: [{ price: { id: 'price_1', unit_amount: 1000 } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1 }]); // Exists

      await service.processEvent(event, {});
      expect(mockSuscripcionesService.createOne).not.toHaveBeenCalled();
    });

    it('handleSubscriptionCreated handles user not found', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            customer: 'cus_unknown',
            current_period_start: 100,
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1', unit_amount: 1000 } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      mockUsersService.readByQuery.mockResolvedValue([]); // No user found

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.createOne).toHaveBeenCalled();
      expect(mockUsersService.updateOne).not.toHaveBeenCalled();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    // customer.subscription.updated
    it('handleSubscriptionUpdated updates subscription', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1' } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, plan_id: 'price_1' }]);

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'active' })
      );
    });

    it('handleSubscriptionUpdated detects plan change', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_2' } }] },
          },
        },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, plan_id: 'price_1' }]); // Different plan

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ plan_id: 'price_2' })
      );
    });

    it('handleSubscriptionUpdated ignores if not found', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_unknown', items: { data: [{ price: { id: 'price_1' } }] } } },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).not.toHaveBeenCalled();
    });

    // customer.subscription.deleted
    it('handleSubscriptionDeleted cancels subscription', async () => {
      const event = { type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } };
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, user_id: 'user_1' }]);
      mockUsersService.readOne.mockResolvedValue({ id: 'user_1', email: 'test@test.com' });

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'canceled' })
      );
      expect(mockUsersService.updateOne).toHaveBeenCalledWith('user_1', {
        estado_suscripcion: 'inactive',
      });
    });

    it('handleSubscriptionDeleted ignores if not found', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_unknown' } },
      };
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).not.toHaveBeenCalled();
    });

    it('handleSubscriptionDeleted handles missing user', async () => {
      const event = { type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } };
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, user_id: null }]); // No user linked

      await service.processEvent(event, {});

      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'canceled' })
      );
      expect(mockUsersService.updateOne).not.toHaveBeenCalled();
    });

    // invoice.payment_succeeded
    it('handleInvoicePaymentSucceeded creates payment', async () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_1',
            subscription: 'sub_1',
            payment_intent: 'pi_1',
            amount_paid: 1000,
            created: 100,
          },
        },
      };

      await service.processEvent(event, {});

      expect(mockPagosService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          referencia: 'pi_1',
          monto: 10,
          stripe_invoice_id: 'inv_1',
        })
      );
    });

    it('handleInvoicePaymentSucceeded ignores if no subscription', async () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_1',
            subscription: null,
            payment_intent: 'pi_1',
          },
        },
      };

      await service.processEvent(event, {});

      expect(mockPagosService.createOne).not.toHaveBeenCalled();
    });

    // invoice.payment_failed
    it('handleInvoicePaymentFailed sends email', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_1',
            customer: 'cus_1',
            amount_due: 1000,
            hosted_invoice_url: 'http://url',
          },
        },
      };
      mockUsersService.readByQuery.mockResolvedValue([{ id: 'user_1' }]);
      mockUsersService.readOne.mockResolvedValue({ id: 'user_1', email: 'test@test.com' });

      await service.processEvent(event, {});
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@test.com' })
      );
    });

    it('handleInvoicePaymentFailed ignores if user not found', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: { object: { id: 'inv_1', customer: 'cus_1' } },
      };
      mockUsersService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('handleRefundEvent handles charge object without refunds', async () => {
      const event = {
        type: 'charge.refunded',
        data: { object: { object: 'charge', id: 'ch_1', refunds: { data: [] } } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).not.toHaveBeenCalled();
    });

    it('handleRefundEvent uses refund status if present', async () => {
      const event = {
        type: 'charge.refund.updated',
        data: { object: { object: 'refund', id: 're_1', status: 'pending', created: 1000 } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'pending',
        })
      );
    });

    it('handleRefundEvent defaults to succeeded status if missing', async () => {
      const event = {
        type: 'charge.refunded',
        data: { object: { object: 'refund', id: 're_1', created: 1000 } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'succeeded',
        })
      );
    });

    // invoice.payment_action_required
    it('handleInvoicePaymentActionRequired runs without error', async () => {
      const event = {
        type: 'invoice.payment_action_required',
        data: { object: { id: 'inv_1' } },
      };

      await service.processEvent(event, {});
      // Should not throw
    });

    // charge.refunded
    it('handleRefundEvent updates refund status', async () => {
      const event = {
        type: 'charge.refunded',
        data: {
          object: {
            object: 'charge',
            refunds: { data: [{ id: 're_1', status: 'succeeded', created: 100 }] },
          },
        },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await service.processEvent(event, {});

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'succeeded' })
      );
    });

    it('handleRefundEvent handles charge object', async () => {
      const event = {
        type: 'charge.refunded',
        data: {
          object: {
            object: 'charge',
            refunds: { data: [{ id: 're_1', status: 'succeeded', created: 100 }] },
          },
        },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await service.processEvent(event, {});

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'succeeded' })
      );
    });

    it('handleRefundEvent handles invalid object', async () => {
      const event = {
        type: 'charge.refunded',
        data: { object: { object: 'unknown' } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).not.toHaveBeenCalled();
    });

    it('handleRefundEvent ignores if not found', async () => {
      const event = {
        type: 'charge.refunded',
        data: { object: { id: 're_unknown', object: 'refund' } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).not.toHaveBeenCalled();
    });

    it('handleRefundFailed updates refund status', async () => {
      const event = {
        type: 'charge.refund.failed',
        data: { object: { id: 're_1', failure_reason: 'expired' } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await service.processEvent(event, {});

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'failed', notas: expect.stringContaining('expired') })
      );
    });

    it('handleRefundFailed ignores if not found', async () => {
      const event = {
        type: 'charge.refund.failed',
        data: { object: { id: 're_unknown', failure_reason: 'expired' } },
      };
      mockReembolsosService.readByQuery.mockResolvedValue([]);

      await service.processEvent(event, {});
      expect(mockReembolsosService.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('Helpers', () => {
    it('findUserIdByStripeCustomer returns id if found', async () => {
      mockUsersService.readByQuery.mockResolvedValue([{ id: 'user_1' }]);
      const result = await service.findUserIdByStripeCustomer('cus_1', {});
      expect(result).toBe('user_1');
    });

    it('findUserIdByStripeCustomer returns null if not found', async () => {
      mockUsersService.readByQuery.mockResolvedValue([]);
      const result = await service.findUserIdByStripeCustomer('cus_1', {});
      expect(result).toBeNull();
    });

    it('sendEmail handles error gracefully', async () => {
      mockUsersService.readOne.mockRejectedValue(new Error('Email error'));
      await service.sendEmail('user_1', 'Subject', 'template', {}, {});
      // Should not throw
    });

    it('sendEmail skips if user has no email', async () => {
      mockUsersService.readOne.mockResolvedValue({ id: 'user_1' }); // No email
      await service.sendEmail('user_1', 'Subject', 'template', {}, {});
      expect(mockMailService.send).not.toHaveBeenCalled();
    });
  });
});

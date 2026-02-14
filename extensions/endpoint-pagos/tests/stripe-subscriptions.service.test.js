import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeSubscriptionsService } from '../src/stripe-subscriptions.service.js';
import * as stripeService from '../src/stripe-service.js';

// Mock stripe-service
vi.mock('../src/stripe-service.js', () => ({
  createOrRetrieveCustomer: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  pauseSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  retrieveSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
}));

describe('StripeSubscriptionsService', () => {
  let service;
  let mockItemsService;
  let mockServices;

  // Mock collection services
  let mockClientesService;
  let mockSuscripcionesService;
  let mockPlanesService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClientesService = {
      readOne: vi.fn(),
      updateOne: vi.fn(),
    };
    mockSuscripcionesService = {
      readOne: vi.fn(),
      createOne: vi.fn(),
      updateOne: vi.fn(),
      readByQuery: vi.fn(),
    };
    mockPlanesService = {
      readOne: vi.fn(),
    };

    mockItemsService = vi.fn(function (collection) {
      if (collection === 'clientes') return mockClientesService;
      if (collection === 'suscripciones') return mockSuscripcionesService;
      if (collection === 'planes_suscripcion') return mockPlanesService;
      return {};
    });

    mockServices = {
      ItemsService: mockItemsService,
    };

    service = new StripeSubscriptionsService({
      services: mockServices,
      database: {},
      accountability: {},
      getSchema: vi.fn().mockResolvedValue({}),
    });
  });

  describe('create', () => {
    it('throws error if plan not found', async () => {
      mockPlanesService.readOne.mockResolvedValue(null);
      await expect(service.create({ plan_id: 1 })).rejects.toThrow('Plan no encontrado');
    });

    it('throws error if plan has no stripe_price_id', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 1, stripe_price_id: null });
      await expect(service.create({ plan_id: 1 })).rejects.toThrow('Plan no configurado en Stripe');
    });

    it('calls createSubscription with correct params', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 1, stripe_price_id: 'price_123' });

      // Mock createSubscription internally
      const createSubSpy = vi.spyOn(service, 'createSubscription').mockResolvedValue({});

      await service.create({ cliente_id: 1, plan_id: 1, venta_id: 10 });

      expect(createSubSpy).toHaveBeenCalledWith(1, 'price_123', null, {
        venta_id: 10,
        plan_id: 1,
        cliente_id: 1,
      });
    });
  });

  describe('createSubscription', () => {
    it('throws error if cliente not found', async () => {
      mockClientesService.readOne.mockRejectedValue(new Error('Not found'));
      await expect(service.createSubscription(1, 'price_123')).rejects.toThrow(
        'Cliente no encontrado en Directus'
      );
    });

    it('handles incomplete status', async () => {
      mockClientesService.readOne.mockResolvedValue({ id: 1 });
      stripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      stripeService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'incomplete',
        start_date: 1234567890,
        metadata: {},
      });
      mockSuscripcionesService.createOne.mockResolvedValue({ id: 10 });

      const result = await service.createSubscription(1, 'price_123');

      expect(result.stripeStatus).toBe('incomplete');
    });

    it('creates subscription successfully', async () => {
      mockClientesService.readOne.mockResolvedValue({ id: 1 });
      stripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      stripeService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        start_date: 1234567890,
        metadata: {},
      });
      mockSuscripcionesService.createOne.mockResolvedValue({ id: 10 });

      const result = await service.createSubscription(1, 'price_123');
      expect(result.stripeStatus).toBe('active');
    });

    it('re-throws unexpected errors from stripe subscription creation', async () => {
      mockClientesService.readOne.mockResolvedValue({ id: 1 });
      stripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_1' });
      stripeService.createSubscription.mockRejectedValue(new Error('Subscription Error'));
      await expect(service.createSubscription(1, 'price_123')).rejects.toThrow(
        'Subscription Error'
      );
    });
  });

  describe('changePlan', () => {
    it('throws error if new plan not found', async () => {
      mockPlanesService.readOne.mockResolvedValue(null);
      await expect(service.changePlan(1, 2)).rejects.toThrow('Nuevo plan no encontrado');
    });

    it('throws error if new plan has no stripe_price_id', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 2, stripe_price_id: null });
      await expect(service.changePlan(1, 2)).rejects.toThrow('Plan no configurado en Stripe');
    });

    it('updates subscription and plan_id', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 2, stripe_price_id: 'price_456' });
      const updateSubSpy = vi.spyOn(service, 'updateSubscription').mockResolvedValue({});

      await service.changePlan(1, 2);

      expect(updateSubSpy).toHaveBeenCalledWith(1, 'price_456');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { plan_id: 2 });
    });
  });

  describe('updateSubscription', () => {
    it('throws error if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(service.updateSubscription(1, 'price_123')).rejects.toThrow(
        'Suscripción no encontrada en Directus'
      );
    });

    it('updates stripe and directus', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.updateSubscription.mockResolvedValue({ metadata: { foo: 'bar' } });

      await service.updateSubscription(1, 'price_123');

      expect(stripeService.updateSubscription).toHaveBeenCalledWith('sub_123', 'price_123');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ metadata: { foo: 'bar' } })
      );
    });

    it('re-throws errors', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({ id: 1 });
      stripeService.updateSubscription.mockRejectedValue(new Error('Stripe Error'));
      await expect(service.updateSubscription(1, 'p')).rejects.toThrow('Stripe Error');
    });
  });

  describe('cancelSubscription', () => {
    it('throws error if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(service.cancel(1)).rejects.toThrow('Suscripción no encontrada en Directus');
    });

    it('cancels immediately', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.cancelSubscription.mockResolvedValue({ status: 'canceled' });

      await service.cancelSubscription(1, true);

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_123', true);
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fecha_cancelacion: expect.any(Date),
          cancel_at_period_end: false,
        })
      );
    });

    it('cancels at period end', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.cancelSubscription.mockResolvedValue({ status: 'active' });

      await service.cancelSubscription(1, false);

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_123', false);
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fecha_cancelacion: null,
          cancel_at_period_end: true,
        })
      );
    });

    it('re-throws errors', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({ id: 1 });
      stripeService.cancelSubscription.mockRejectedValue(new Error('Stripe Error'));
      await expect(service.cancel(1)).rejects.toThrow('Stripe Error');
    });
  });

  describe('retrieveSubscription', () => {
    it('throws error if not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(service.retrieveSubscription(1)).rejects.toThrow('Suscripción no encontrada');
    });

    it('retrieves from stripe', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.retrieveSubscription.mockResolvedValue({ id: 'sub_123' });

      const result = await service.retrieveSubscription(1);
      expect(result.id).toBe('sub_123');
    });
  });

  describe('listSubscriptions', () => {
    it('returns empty array if no subscriptions in directus', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      const result = await service.listSubscriptions(1);
      expect(result).toEqual([]);
    });

    it('returns empty array if no stripe_customer_id', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1, stripe_customer_id: null }]);
      const result = await service.listSubscriptions(1);
      expect(result).toEqual([]);
    });

    it('lists from stripe', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([
        { id: 1, stripe_customer_id: 'cus_123' },
      ]);
      stripeService.listSubscriptions.mockResolvedValue([{ id: 'sub_1' }]);

      const result = await service.listSubscriptions(1);
      expect(result).toEqual([{ id: 'sub_1' }]);
    });
  });

  describe('pauseSubscription', () => {
    it('throws if not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(service.pause(1)).rejects.toThrow('Suscripción no encontrada');
    });

    it('pauses and updates directus', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.pauseSubscription.mockResolvedValue({});

      await service.pause(1);

      expect(stripeService.pauseSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { estado: 'paused' });
    });
  });

  describe('resumeSubscription', () => {
    it('throws if not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(service.resume(1)).rejects.toThrow('Suscripción no encontrada');
    });

    it('resumes and updates directus', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      stripeService.resumeSubscription.mockResolvedValue({ status: 'active' });

      await service.resume(1);

      expect(stripeService.resumeSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { estado: 'active' });
    });
  });
});

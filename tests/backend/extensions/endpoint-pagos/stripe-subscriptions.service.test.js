jest.mock('../../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  createOrRetrieveCustomer: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  retrieveSubscription: jest.fn(),
  listSubscriptions: jest.fn(),
}));

const {
  StripeSubscriptionsService,
} = require('../../../../extensions/endpoint-pagos/src/stripe-subscriptions.service');
const mockStripeService = require('../../../../extensions/endpoint-pagos/src/stripe-service.js');

describe('StripeSubscriptionsService', () => {
  let stripeSubscriptionsService;
  let mockServices;
  let mockDatabase;
  let mockAccountability;
  let mockGetSchema;
  let mockItemsService;
  let mockPlanesService;
  let mockSuscripcionesService;
  let mockClientesService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlanesService = {
      readOne: jest.fn(),
    };

    mockSuscripcionesService = {
      createOne: jest.fn(),
      readOne: jest.fn(),
      updateOne: jest.fn(),
      readByQuery: jest.fn(),
    };

    mockClientesService = {
      readOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockItemsService = jest.fn((collection) => {
      switch (collection) {
        case 'planes_suscripcion':
          return mockPlanesService;
        case 'suscripciones':
          return mockSuscripcionesService;
        case 'clientes':
          return mockClientesService;
        default:
          return { readOne: jest.fn() };
      }
    });

    mockServices = {
      ItemsService: mockItemsService,
    };

    mockDatabase = {};
    mockAccountability = {};
    mockGetSchema = jest.fn().mockResolvedValue({});

    stripeSubscriptionsService = new StripeSubscriptionsService({
      services: mockServices,
      database: mockDatabase,
      accountability: mockAccountability,
      getSchema: mockGetSchema,
    });
  });

  describe('create', () => {
    test('should create subscription via plan_id successfully', async () => {
      const data = { cliente_id: 1, plan_id: 2, venta_id: 3 };
      mockPlanesService.readOne.mockResolvedValue({ id: 2, stripe_price_id: 'price_123' });

      // Mock internal createSubscription call
      // Since create calls this.createSubscription, we can spy on it or let it run.
      // Letting it run is better for coverage, but we need to mock dependencies of createSubscription too.
      // createSubscription uses 'clientes' and 'suscripciones' services.

      mockClientesService.readOne.mockResolvedValue({ id: 1, email: 'test@test.com' });
      mockStripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      mockStripeService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        start_date: 1672531200,
        metadata: {},
        latest_invoice: { payment_intent: { client_secret: 'sec_123' } },
      });
      mockSuscripcionesService.createOne.mockResolvedValue({ id: 10, estado: 'active' });

      const result = await stripeSubscriptionsService.create(data);

      expect(mockPlanesService.readOne).toHaveBeenCalledWith(2);
      expect(mockClientesService.readOne).toHaveBeenCalledWith(1);
      expect(mockStripeService.createOrRetrieveCustomer).toHaveBeenCalled();
      expect(mockStripeService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_123',
          priceId: 'price_123',
        })
      );
      expect(mockSuscripcionesService.createOne).toHaveBeenCalled();
      expect(result).toHaveProperty('clientSecret', 'sec_123');
    });

    test('should throw error if plan not found', async () => {
      mockPlanesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.create({ plan_id: 1 })).rejects.toThrow(
        'Plan no encontrado'
      );
    });

    test('should throw error if plan has no stripe_price_id', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 1 });
      await expect(stripeSubscriptionsService.create({ plan_id: 1 })).rejects.toThrow(
        'Plan no configurado en Stripe'
      );
    });
  });

  describe('createSubscription', () => {
    test('should throw error if client not found in Directus', async () => {
      mockClientesService.readOne.mockRejectedValue(new Error('Not found'));
      await expect(stripeSubscriptionsService.createSubscription(1, 'price_123')).rejects.toThrow(
        'Cliente no encontrado en Directus'
      );
    });

    test('should handle stripe incomplete status', async () => {
      mockClientesService.readOne.mockResolvedValue({ id: 1 });
      mockStripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      mockStripeService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'incomplete',
        start_date: 1672531200,
      });
      mockSuscripcionesService.createOne.mockResolvedValue({ id: 10 });

      const result = await stripeSubscriptionsService.createSubscription(1, 'price_123');

      expect(result.stripeStatus).toBe('incomplete');
    });

    test('should log and rethrow error if creation fails', async () => {
      mockClientesService.readOne.mockResolvedValue({ id: 1 });
      mockStripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      mockStripeService.createSubscription.mockRejectedValue(new Error('Stripe Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(stripeSubscriptionsService.createSubscription(1, 'price_123')).rejects.toThrow(
        'Stripe Error'
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('changePlan', () => {
    test('should change plan successfully', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 2, stripe_price_id: 'price_new' });

      // Mock updateSubscription dependencies
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.updateSubscription.mockResolvedValue({ metadata: {} });
      mockSuscripcionesService.updateOne.mockResolvedValue({});

      await stripeSubscriptionsService.changePlan(1, 2);

      expect(mockPlanesService.readOne).toHaveBeenCalledWith(2);
      expect(mockStripeService.updateSubscription).toHaveBeenCalledWith('sub_123', 'price_new');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { plan_id: 2 });
    });

    test('should throw if new plan not found', async () => {
      mockPlanesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.changePlan(1, 2)).rejects.toThrow(
        'Nuevo plan no encontrado'
      );
    });

    test('should throw if new plan has no stripe_price_id', async () => {
      mockPlanesService.readOne.mockResolvedValue({ id: 2 });
      await expect(stripeSubscriptionsService.changePlan(1, 2)).rejects.toThrow(
        'Plan no configurado en Stripe'
      );
    });
  });

  describe('updateSubscription', () => {
    test('should throw if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.updateSubscription(1, 'price_new')).rejects.toThrow(
        'Suscripción no encontrada en Directus'
      );
    });

    test('should update stripe subscription and sync metadata', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.updateSubscription.mockResolvedValue({ metadata: { foo: 'bar' } });

      await stripeSubscriptionsService.updateSubscription(1, 'price_new');

      expect(mockStripeService.updateSubscription).toHaveBeenCalledWith('sub_123', 'price_new');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, {
        metadata: { foo: 'bar' },
      });
    });

    test('should log and rethrow error on update failure', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.updateSubscription.mockRejectedValue(new Error('Update failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(stripeSubscriptionsService.updateSubscription(1, 'price_new')).rejects.toThrow(
        'Update failed'
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('cancelSubscription', () => {
    test('should cancel subscription successfully', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.cancelSubscription.mockResolvedValue({ status: 'canceled' });

      await stripeSubscriptionsService.cancelSubscription(1, true);

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith('sub_123', true);
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'canceled',
          cancel_at_period_end: false,
        })
      );
    });

    test('should throw if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.cancelSubscription(1)).rejects.toThrow(
        'Suscripción no encontrada en Directus'
      );
    });

    test('should log and rethrow error on cancel failure', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.cancelSubscription.mockRejectedValue(new Error('Cancel failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(stripeSubscriptionsService.cancelSubscription(1)).rejects.toThrow(
        'Cancel failed'
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('alias cancel should call cancelSubscription', async () => {
      const spy = jest
        .spyOn(stripeSubscriptionsService, 'cancelSubscription')
        .mockResolvedValue('ok');
      await stripeSubscriptionsService.cancel(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });

  describe('pauseSubscription', () => {
    test('should pause subscription successfully', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.pauseSubscription.mockResolvedValue({});

      await stripeSubscriptionsService.pauseSubscription(1);

      expect(mockStripeService.pauseSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { estado: 'paused' });
    });

    test('should throw if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.pauseSubscription(1)).rejects.toThrow(
        'Suscripción no encontrada'
      );
    });

    test('alias pause should call pauseSubscription', async () => {
      const spy = jest
        .spyOn(stripeSubscriptionsService, 'pauseSubscription')
        .mockResolvedValue('ok');
      await stripeSubscriptionsService.pause(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });

  describe('resumeSubscription', () => {
    test('should resume subscription successfully', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.resumeSubscription.mockResolvedValue({ status: 'active' });

      await stripeSubscriptionsService.resumeSubscription(1);

      expect(mockStripeService.resumeSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockSuscripcionesService.updateOne).toHaveBeenCalledWith(1, { estado: 'active' });
    });

    test('should throw if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.resumeSubscription(1)).rejects.toThrow(
        'Suscripción no encontrada'
      );
    });

    test('alias resume should call resumeSubscription', async () => {
      const spy = jest
        .spyOn(stripeSubscriptionsService, 'resumeSubscription')
        .mockResolvedValue('ok');
      await stripeSubscriptionsService.resume(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });

  describe('retrieveSubscription', () => {
    test('should retrieve subscription successfully', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue({
        id: 1,
        stripe_subscription_id: 'sub_123',
      });
      mockStripeService.retrieveSubscription.mockResolvedValue({ id: 'sub_123' });

      const result = await stripeSubscriptionsService.retrieveSubscription(1);

      expect(mockStripeService.retrieveSubscription).toHaveBeenCalledWith('sub_123');
      expect(result).toEqual({ id: 'sub_123' });
    });

    test('should throw if subscription not found', async () => {
      mockSuscripcionesService.readOne.mockResolvedValue(null);
      await expect(stripeSubscriptionsService.retrieveSubscription(1)).rejects.toThrow(
        'Suscripción no encontrada'
      );
    });
  });

  describe('listSubscriptions', () => {
    test('should list subscriptions for a customer', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ stripe_customer_id: 'cus_123' }]);
      mockStripeService.listSubscriptions.mockResolvedValue([{ id: 'sub_123' }]);

      const result = await stripeSubscriptionsService.listSubscriptions(1);

      expect(mockSuscripcionesService.readByQuery).toHaveBeenCalled();
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith('cus_123');
      expect(result).toHaveLength(1);
    });

    test('should return empty array if no subscription record found', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([]);
      const result = await stripeSubscriptionsService.listSubscriptions(1);
      expect(result).toEqual([]);
    });

    test('should return empty array if subscription record has no stripe_customer_id', async () => {
      mockSuscripcionesService.readByQuery.mockResolvedValue([{ id: 1 }]); // missing stripe_customer_id
      const result = await stripeSubscriptionsService.listSubscriptions(1);
      expect(result).toEqual([]);
    });
  });
});

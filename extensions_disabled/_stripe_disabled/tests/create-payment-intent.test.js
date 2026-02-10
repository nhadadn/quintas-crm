import { jest } from '@jest/globals';
import { createPaymentIntent } from '../src/payment-service.js';

describe('createPaymentIntent', () => {
  let mockStripe;
  let mockServices;
  let mockItemsService;
  let mockSchema = {};
  let mockAccountability = { user: 'user_123' };

  beforeEach(() => {
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
      },
    };

    mockItemsService = {
      readOne: jest.fn(),
      updateOne: jest.fn(),
    };

    // Mock ItemsService constructor
    const MockItemsServiceConstructor = jest.fn(() => mockItemsService);

    mockServices = {
      ItemsService: MockItemsServiceConstructor,
    };
  });

  it('should create a payment intent with valid data', async () => {
    const body = {
      amount: 100,
      pago_id: 'pago_123',
      cliente_id: 'client_123',
    };

    // Mock DB response
    mockItemsService.readOne.mockResolvedValue({
      id: 'pago_123',
      estatus: 'pendiente',
      venta_id: {
        cliente_id: 'client_123',
      },
    });

    // Mock Stripe response
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'secret_123',
      amount: 10000,
      currency: 'mxn',
      customer: 'cus_123',
    });

    const result = await createPaymentIntent(
      mockStripe,
      mockServices,
      mockSchema,
      mockAccountability,
      body
    );

    // Assert DB read
    expect(mockItemsService.readOne).toHaveBeenCalledWith('pago_123', expect.any(Object));

    // Assert Stripe call
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        metadata: { pago_id: 'pago_123', cliente_id: 'client_123' },
      })
    );

    // Assert DB update
    expect(mockItemsService.updateOne).toHaveBeenCalledWith('pago_123', {
      stripe_payment_intent_id: 'pi_123',
      stripe_customer_id: 'cus_123',
    });

    // Assert result
    expect(result).toEqual({
      clientSecret: 'secret_123',
      paymentIntentId: 'pi_123',
    });
  });

  it('should return 404 if pago not found', async () => {
    mockItemsService.readOne.mockResolvedValue(null);

    const body = { amount: 100, pago_id: 'pago_unknown' };

    await expect(
      createPaymentIntent(mockStripe, mockServices, mockSchema, mockAccountability, body)
    ).rejects.toMatchObject({
      message: 'Pago no encontrado',
      status: 404,
    });
  });

  it('should return 409 if pago already paid', async () => {
    mockItemsService.readOne.mockResolvedValue({
      id: 'pago_123',
      estatus: 'pagado',
    });

    const body = { amount: 100, pago_id: 'pago_123' };

    try {
      await createPaymentIntent(mockStripe, mockServices, mockSchema, mockAccountability, body);
      fail('Should have thrown error');
    } catch (e) {
      expect(e.message).toContain('ya ha sido procesado');
      expect(e.status).toBe(409);
    }
  });

  it('should return 403 if client mismatch', async () => {
    mockItemsService.readOne.mockResolvedValue({
      id: 'pago_123',
      estatus: 'pendiente',
      venta_id: {
        cliente_id: 'client_actual',
      },
    });

    const body = { amount: 100, pago_id: 'pago_123', cliente_id: 'client_wrong' };

    try {
      await createPaymentIntent(mockStripe, mockServices, mockSchema, mockAccountability, body);
      fail('Should have thrown error');
    } catch (e) {
      expect(e.message).toBe('El pago no corresponde al cliente indicado');
      expect(e.status).toBe(403);
    }
  });
});

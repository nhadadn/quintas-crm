import { jest } from '@jest/globals';
import pagosEndpoint from '../../../extensions/endpoint-pagos/src/index.js';
import { mockContext, mockRouter, mockRes } from '../setup';
import * as stripeService from '../../../extensions/endpoint-pagos/src/stripe-service.js';

// Mock Stripe Service
jest.mock('../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  createPaymentIntent: jest.fn(),
  createOrRetrieveCustomer: jest.fn(),
  constructEvent: jest.fn(),
}));

describe('Webhook Handler (Stripe)', () => {
  let router;
  let webhookHandler;
  let itemsServiceMock;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    
    // Setup Context & Services
    const { ItemsService } = mockContext.services;
    itemsServiceMock = {
      readByQuery: jest.fn(),
      updateOne: jest.fn(),
    };
    ItemsService.mockImplementation(() => itemsServiceMock);

    // Initialize Endpoint
    pagosEndpoint(router, mockContext);
    
    // Extract Webhook Handler
    const call = router.post.mock.calls.find(call => call[0] === '/webhook');
    if (call) webhookHandler = call[call.length - 1];
    
    // Mock Env
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  test('should handle payment_intent.succeeded event', async () => {
    const req = {
      headers: { 'stripe-signature': 'valid_sig' },
      body: { type: 'payment_intent.succeeded' }, // Fallback if rawBody missing
    };
    const res = mockRes();

    // Mock constructEvent
    stripeService.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          customer: 'cus_123',
          charges: {
            data: [{
              payment_method_details: { card: { last4: '4242' } }
            }]
          }
        }
      }
    });

    // Mock Database Find
    itemsServiceMock.readByQuery.mockResolvedValue([{ id: 'pago-1' }]);

    await webhookHandler(req, res);

    expect(stripeService.constructEvent).toHaveBeenCalled();
    expect(itemsServiceMock.updateOne).toHaveBeenCalledWith('pago-1', expect.objectContaining({
      estatus: 'pagado',
      stripe_last4: '4242',
      metodo_pago: 'tarjeta'
    }));
  });

  test('should handle payment_intent.payment_failed event', async () => {
    const req = {
      headers: { 'stripe-signature': 'valid_sig' },
      body: {},
    };
    const res = mockRes();

    stripeService.constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail',
          last_payment_error: { message: 'Insufficient funds' }
        }
      }
    });

    itemsServiceMock.readByQuery.mockResolvedValue([{ id: 'pago-1', notas: 'Notas previas' }]);

    await webhookHandler(req, res);

    expect(itemsServiceMock.updateOne).toHaveBeenCalledWith('pago-1', expect.objectContaining({
      notas: expect.stringContaining('Insufficient funds')
    }));
  });

  test('should return 400 on invalid signature', async () => {
    const req = {
      headers: { 'stripe-signature': 'invalid_sig' },
      body: {},
    };
    const res = mockRes();

    stripeService.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await webhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
  });

  test('should warn if secret is missing but process insecurely (dev mode logic)', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    
    const req = {
      headers: {},
      body: { 
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_dev' } }
      },
    };
    const res = mockRes();

    // Mock Database Find
    itemsServiceMock.readByQuery.mockResolvedValue([{ id: 'pago-1' }]);

    await webhookHandler(req, res);

    // Should NOT call constructEvent
    expect(stripeService.constructEvent).not.toHaveBeenCalled();
    
    // Should still process logic
    expect(itemsServiceMock.updateOne).toHaveBeenCalled();
  });
});

import pagosEndpoint from '../../../../extensions/endpoint-pagos/src/index.js';
import { mockContext } from '../../setup';
import * as stripeService from '../../../../extensions/endpoint-pagos/src/stripe-service.js';

// Mock Stripe Service
jest.mock('../../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  createPaymentIntent: jest.fn(),
  createOrRetrieveCustomer: jest.fn(),
  constructEvent: jest.fn(),
}));

// Mock express router
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Stripe Payment Intent (Pagos Extension)', () => {
  let router;
  let createIntentHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    pagosEndpoint(router, mockContext);

    // Extract handler
    const call = router.post.mock.calls.find((call) => call[0] === '/create-payment-intent');
    if (call) createIntentHandler = call[call.length - 1];
  });

  test('should register POST /create-payment-intent', () => {
    expect(router.post).toHaveBeenCalledWith('/create-payment-intent', expect.any(Function));
  });

  test('should create payment intent successfully', async () => {
    const req = {
      body: {
        cliente_id: 'c-1',
        venta_id: 'v-1',
        numero_pago: 1,
      },
      accountability: { user: 'admin' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = mockRes();

    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();

    // Mock Pagos Service (Find Payment)
    itemsServiceInstance.readByQuery.mockResolvedValue([
      {
        id: 'p-1',
        monto: 1000,
        estatus: 'pendiente',
        venta_id: { id: 'v-1', cliente_id: 'c-1', lote_id: 'l-1' },
        numero_pago: 1,
      },
    ]);

    // Mock Clientes Service (Find/Create Stripe Customer)
    itemsServiceInstance.readOne.mockResolvedValue({
      id: 'c-1',
      nombre: 'Test',
      email: 'test@example.com',
      stripe_customer_id: 'cus_123',
    });

    // Mock Stripe Service
    stripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
    stripeService.createPaymentIntent.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'secret_123',
    });

    await createIntentHandler(req, res);

    expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: 'secret_123',
        paymentIntentId: 'pi_123',
      })
    );

    // Verify DB update (stripe fields)
    expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({
        stripe_payment_intent_id: 'pi_123',
        stripe_customer_id: 'cus_123',
      })
    );
  });

  test('should return 404 if payment does not exist', async () => {
    const req = {
      body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 99 },
      accountability: { user: 'admin' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = mockRes();

    const { ItemsService } = mockContext.services;
    new ItemsService().readByQuery.mockResolvedValue([]); // No payment found

    await createIntentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should return 409 if payment is already processed', async () => {
    const req = {
      body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
      accountability: { user: 'admin' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = mockRes();

    const { ItemsService } = mockContext.services;
    // Mock Payment Found but Paid
    new ItemsService().readByQuery.mockResolvedValue([
      {
        id: 'p-1',
        estatus: 'pagado',
        venta_id: { id: 'v-1', cliente_id: 'c-1' },
      },
    ]);

    await createIntentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('should validate ownership (RLS)', async () => {
    const req = {
      body: { cliente_id: 'c-hacker', venta_id: 'v-1', numero_pago: 1 },
      accountability: { user: 'admin' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = mockRes();

    const { ItemsService } = mockContext.services;
    new ItemsService().readByQuery.mockResolvedValue([
      {
        id: 'p-1',
        estatus: 'pendiente',
        venta_id: { id: 'v-1', cliente_id: 'c-real' }, // Different client
      },
    ]);

    await createIntentHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

import request from 'supertest';
import express from 'express';
import endpointPagos from '../../../../extensions/endpoint-pagos/src/index.js';
import * as stripeService from '../../../../extensions/endpoint-pagos/src/stripe-service.js';
import * as validators from '../../../../extensions/endpoint-pagos/src/validators.js';

// Mock dependencies
jest.mock('../../../../extensions/endpoint-pagos/src/stripe-service.js');
jest.mock('../../../../extensions/endpoint-pagos/src/validators.js', () => ({
  createPaymentIntentSchema: { parse: jest.fn((x) => x) },
  createSubscriptionSchema: { parse: jest.fn((x) => x) },
  changePlanSchema: { parse: jest.fn((x) => x) },
  refundSchema: { parse: jest.fn((x) => x) },
  rejectRefundSchema: { parse: jest.fn((x) => x) },
  reportSchema: { parse: jest.fn((x) => x) },
}));

// Mock Service Classes
const mockSubscriptionService = {
  listSubscriptions: jest.fn(),
  retrieveSubscription: jest.fn(),
  create: jest.fn(),
  changePlan: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
};

const mockRefundService = {
  requestRefund: jest.fn(),
  approveRefund: jest.fn(),
  rejectRefund: jest.fn(),
  listRefunds: jest.fn(),
  retrieveRefund: jest.fn(),
};

const mockWebhookService = {
  handleEvent: jest.fn(),
};

const mockReportsService = {
  generateIncomeReport: jest.fn(),
  getSubscriptionMetrics: jest.fn(),
  getRevenueByPlan: jest.fn(),
  getChurnRate: jest.fn(),
  getMRR: jest.fn(),
  getARPU: jest.fn(),
  getRefundMetrics: jest.fn(),
  getDashboardMetrics: jest.fn(),
  getRevenueForecast: jest.fn(),
};

jest.mock('../../../../extensions/endpoint-pagos/src/stripe-subscriptions.service.js', () => ({
  StripeSubscriptionsService: jest.fn(() => mockSubscriptionService),
}));
jest.mock('../../../../extensions/endpoint-pagos/src/refund-service.js', () => ({
  RefundService: jest.fn(() => mockRefundService),
}));
jest.mock('../../../../extensions/endpoint-pagos/src/webhook-service.js', () => ({
  WebhookService: jest.fn(() => mockWebhookService),
}));
jest.mock('../../../../extensions/endpoint-pagos/src/reports-service.js', () => ({
  ReportsService: jest.fn(() => mockReportsService),
}));

describe('Endpoint Pagos Router', () => {
  let app;
  let mockItemsService;
  let mockDatabase;
  let mockTrx;
  let mockQueryBuilder;
  let mockGetSchema;
  let mockPagosService;
  let mockClientesService;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    // Mock req.rawBody for webhook test
    app.use((req, res, next) => {
      req.rawBody = req.body;
      next();
    });

    // Mock ItemsService instance methods
    mockPagosService = {
      readByQuery: jest.fn(),
      readOne: jest.fn(),
      updateOne: jest.fn(),
      createOne: jest.fn(),
    };

    mockClientesService = {
      readOne: jest.fn(),
      updateOne: jest.fn(),
    };

    // Mock ItemsService constructor
    mockItemsService = jest.fn((collection) => {
      if (collection === 'pagos') return mockPagosService;
      if (collection === 'clientes') return mockClientesService;
      return { readByQuery: jest.fn() };
    });

    // Mock Knex Transaction and Query Builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn().mockResolvedValue(1),
      count: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([])),
    };

    mockTrx = jest.fn(() => mockQueryBuilder);
    mockTrx.commit = jest.fn();
    mockTrx.rollback = jest.fn();

    mockDatabase = {
      transaction: jest.fn().mockResolvedValue(mockTrx),
    };

    mockGetSchema = jest.fn().mockResolvedValue({});

    const router = express.Router();

    // Initialize extension
    endpointPagos(router, {
      services: { ItemsService: mockItemsService },
      database: mockDatabase,
      getSchema: mockGetSchema,
    });

    app.use('/', router);
  });

  describe('POST /create-payment-intent', () => {
    const validPayload = {
      pago_id: 'pago-123',
      cliente_id: 'cliente-123',
      venta_id: 'venta-123',
      numero_pago: 1,
    };

    test('should create payment intent successfully', async () => {
      mockPagosService.readByQuery.mockResolvedValue([
        {
          id: 'pago-123',
          venta_id: { id: 'venta-123', cliente_id: 'cliente-123' },
          cliente_id: 'cliente-123',
          estatus: 'pendiente',
          monto: 100,
          numero_pago: 1,
        },
      ]);

      mockClientesService.readOne.mockResolvedValue({
        id: 'cliente-123',
        email: 'test@example.com',
        nombre: 'Test User',
      });

      stripeService.createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      stripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });

      const res = await request(app).post('/create-payment-intent').send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        clientSecret: 'secret_123',
        paymentIntentId: 'pi_123',
      });
      expect(mockPagosService.updateOne).toHaveBeenCalledWith(
        'pago-123',
        expect.objectContaining({
          stripe_payment_intent_id: 'pi_123',
          stripe_customer_id: 'cus_123',
        })
      );
    });

    test('should return 404 if pago not found', async () => {
      mockPagosService.readByQuery.mockResolvedValue([]);

      const res = await request(app).post('/create-payment-intent').send(validPayload);

      expect(res.status).toBe(404);
    });

    test('should return 409 if pago already paid', async () => {
      mockPagosService.readByQuery.mockResolvedValue([
        {
          id: 'pago-123',
          venta_id: { id: 'venta-123', cliente_id: 'cliente-123' },
          estatus: 'pagado',
          monto: 100,
        },
      ]);

      const res = await request(app).post('/create-payment-intent').send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.errors[0].message).toContain('ya fue realizado');
    });

    test('should return 403 if client mismatch', async () => {
      mockPagosService.readByQuery.mockResolvedValue([
        {
          id: 'pago-123',
          venta_id: { id: 'venta-123', cliente_id: 'other-client' },
          estatus: 'pendiente',
          monto: 100,
        },
      ]);

      const res = await request(app).post('/create-payment-intent').send(validPayload);

      expect(res.status).toBe(403);
    });
  });

  describe('Suscripciones Routes', () => {
    test('GET /suscripciones should list subscriptions', async () => {
      mockSubscriptionService.listSubscriptions.mockResolvedValue(['sub1']);

      const res = await request(app).get('/suscripciones').query({ cliente_id: '123' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(['sub1']);
      expect(mockSubscriptionService.listSubscriptions).toHaveBeenCalledWith('123');
    });

    test('POST /suscripciones/crear should create subscription', async () => {
      mockSubscriptionService.create.mockResolvedValue({ id: 'sub_123' });

      const res = await request(app).post('/suscripciones/crear').send({ plan_id: 'price_123' });

      expect(res.status).toBe(200);
      expect(mockSubscriptionService.create).toHaveBeenCalled();
    });
  });

  describe('Reembolsos Routes', () => {
    test('POST /reembolsos/solicitar should request refund', async () => {
      mockRefundService.requestRefund.mockResolvedValue({ id: 'ref_123' });

      const res = await request(app).post('/reembolsos/solicitar').send({ pago_id: 'pago_123' });

      expect(res.status).toBe(200);
      expect(mockRefundService.requestRefund).toHaveBeenCalled();
    });
  });

  describe('Reportes Routes', () => {
    test('GET /reportes/ingresos should generate report', async () => {
      mockReportsService.generateIncomeReport.mockResolvedValue({ total: 100 });

      const res = await request(app)
        .get('/reportes/ingresos')
        .query({ fecha_inicio: '2023-01-01' });

      expect(res.status).toBe(200);
      expect(mockReportsService.generateIncomeReport).toHaveBeenCalled();
    });

    test('GET /reportes/ingresos excel format', async () => {
      mockReportsService.generateIncomeReport.mockResolvedValue(Buffer.from('excel'));

      const res = await request(app)
        .get('/reportes/ingresos')
        .query({ fecha_inicio: '2023-01-01', formato: 'excel' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheet|excel/);
    });

    test('GET /reportes/dashboard should generate report', async () => {
      mockReportsService.getDashboardMetrics.mockResolvedValue({});
      const res = await request(app).get(
        '/reportes/dashboard?fecha_inicio=2023-01-01&fecha_fin=2023-01-31'
      );
      expect(res.status).toBe(200);
      expect(mockReportsService.getDashboardMetrics).toHaveBeenCalled();
    });

    test('GET /reportes/forecast should generate report', async () => {
      mockReportsService.getRevenueForecast.mockResolvedValue({});
      const res = await request(app).get('/reportes/forecast');
      expect(res.status).toBe(200);
      expect(mockReportsService.getRevenueForecast).toHaveBeenCalled();
    });

    test('GET /reportes/mrr should generate report', async () => {
      mockReportsService.getMRR.mockResolvedValue({});
      const res = await request(app).get('/reportes/mrr');
      expect(res.status).toBe(200);
      expect(mockReportsService.getMRR).toHaveBeenCalled();
    });

    test('GET /reportes/arpu should generate report', async () => {
      mockReportsService.getARPU.mockResolvedValue({});
      const res = await request(app).get('/reportes/arpu');
      expect(res.status).toBe(200);
      expect(mockReportsService.getARPU).toHaveBeenCalled();
    });

    test('GET /reportes/reembolsos should generate report', async () => {
      mockReportsService.getRefundMetrics.mockResolvedValue({});
      const res = await request(app).get(
        '/reportes/reembolsos?fecha_inicio=2023-01-01&fecha_fin=2023-01-31'
      );
      expect(res.status).toBe(200);
      expect(mockReportsService.getRefundMetrics).toHaveBeenCalled();
    });

    test('GET /reportes/dashboard should handle error', async () => {
      mockReportsService.getDashboardMetrics.mockRejectedValue(new Error('Report Error'));
      const res = await request(app).get(
        '/reportes/dashboard?fecha_inicio=2023-01-01&fecha_fin=2023-01-31'
      );
      expect(res.status).toBe(500);
    });
  });

  describe('Webhooks', () => {
    test('POST /webhooks/stripe should handle event', async () => {
      mockWebhookService.handleEvent.mockResolvedValue(true);

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'sig_123')
        .send({ type: 'payment_intent.succeeded' });

      expect(res.status).toBe(200);
      expect(mockWebhookService.handleEvent).toHaveBeenCalled();
    });

    test('should handle webhook error', async () => {
      mockWebhookService.handleEvent.mockRejectedValue(new Error('signature verification failed'));

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'invalid')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Existing Routes (Legacy)', () => {
    test('GET / should list pagos', async () => {
      mockPagosService.readByQuery.mockResolvedValue(['pago1']);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(['pago1']);
    });

    test('GET /:id should return pago', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: '123' });

      const res = await request(app).get('/123');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: '123' });
    });

    test('GET /:id 404', async () => {
      mockPagosService.readOne.mockResolvedValue(null);

      const res = await request(app).get('/999');

      expect(res.status).toBe(404);
    });

    test('PATCH /:id should update pago', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: '123', estatus: 'pendiente' });
      mockPagosService.updateOne.mockResolvedValue({});

      const res = await request(app).patch('/123').send({ notas: 'Updated' });

      expect(res.status).toBe(200);
      expect(mockPagosService.updateOne).toHaveBeenCalledWith('123', { notas: 'Updated' });
    });

    test('DELETE /:id should be forbidden', async () => {
      const res = await request(app).delete('/123');
      expect(res.status).toBe(403);
    });

    test('GET / should handle 500 error', async () => {
      mockPagosService.readByQuery.mockRejectedValue(new Error('Unexpected'));
      const res = await request(app).get('/');
      expect(res.status).toBe(500);
    });

    test('GET /:id should handle 500 error', async () => {
      mockPagosService.readOne.mockRejectedValue(new Error('Unexpected'));
      const res = await request(app).get('/123');
      expect(res.status).toBe(500);
    });
  });

  describe('POST / (Manual Payment)', () => {
    const paymentPayload = {
      pago_id: 'pago-1',
      monto: 500,
      fecha_pago: '2023-01-01',
      metodo_pago: 'transferencia',
      referencia: 'REF123',
      notas: 'Test payment',
    };

    test('should register payment successfully', async () => {
      // Mock finding the payment
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-1',
        venta_id: 'venta-1',
        monto: 1000,
        monto_pagado: 0,
        estatus: 'pendiente',
        fecha_vencimiento: '2023-01-01',
        mora: 0,
      });

      // Mock finding pending payments for liquidation check (none remaining)
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 0 });

      const res = await request(app).post('/').send(paymentPayload);

      expect(res.status).toBe(200);
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_pagado: 500,
          estatus: 'pendiente', // 500 < 1000
        })
      );
    });

    test('should fail with invalid payload (negative amount)', async () => {
      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, monto: -100 });

      expect(res.status).toBe(400);
      // Transaction is not started yet, so rollback is not called
      expect(mockTrx.rollback).not.toHaveBeenCalled();
    });

    test('should fail if payment not found', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null);

      const res = await request(app).post('/').send(paymentPayload);

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/no encontrado/i);
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should fail if amount exceeds pending balance', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-1',
        monto: 1000,
        monto_pagado: 900, // pending 100
        estatus: 'pendiente',
      });

      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, monto: 200 }); // 200 > 100

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/excede el saldo/i);
    });

    test('should calculate mora if overdue', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-1',
        monto: 1000,
        monto_pagado: 0,
        estatus: 'atrasado',
        fecha_vencimiento: '2022-01-01', // overdue relative to 2023-01-01
        mora: 0,
      });

      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, monto: 1000, fecha_pago: '2023-01-01' });

      expect(res.status).toBe(200);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 50, // 5% of 1000
        })
      );
    });

    test('should liquidate sale if all payments done', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-1',
        venta_id: 'venta-1',
        monto: 1000,
        monto_pagado: 0,
        estatus: 'pendiente',
      });

      // Second query: check pending payments. Returns count 0.
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 0 });

      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, monto: 1000 }); // Full payment

      expect(res.status).toBe(200);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          estatus: 'pagado',
        })
      );

      expect(mockTrx).toHaveBeenCalledWith('ventas');
    });

    test('should fail if neither venta_id nor pago_id provided', async () => {
      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, pago_id: undefined, venta_id: undefined });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/Debe especificar/i);
    });

    test('should fail if pago does not belong to venta', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-1',
        venta_id: 'venta-2', // Different from payload
      });

      const res = await request(app)
        .post('/')
        .send({ ...paymentPayload, pago_id: 'pago-1', venta_id: 'venta-1' });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/no pertenece/i);
    });

    test('should find pending payment by venta_id', async () => {
      // Mock first query (pending) to return a payment
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-pending',
        venta_id: 'venta-1',
        estatus: 'pendiente',
        monto: 1000,
        fecha_vencimiento: '2023-01-01',
        monto_pagado: 0,
      });
      // Mock subsequent count check
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 1 });

      const res = await request(app).post('/').send({ venta_id: 'venta-1', monto: 500 }); // No pago_id

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('pago-pending');
    });

    test('should find overdue payment by venta_id if no pending', async () => {
      // Mock first query (pending) to return null
      mockQueryBuilder.first.mockResolvedValueOnce(null);
      // Mock second query (overdue) to return a payment
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'pago-overdue',
        venta_id: 'venta-1',
        estatus: 'atrasado',
        monto: 1000,
        fecha_vencimiento: '2022-01-01',
        monto_pagado: 0,
      });
      // Mock subsequent count check
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 1 });

      const res = await request(app).post('/').send({ venta_id: 'venta-1', monto: 500 });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('pago-overdue');
    });

    test('should fail if no payments found for venta_id', async () => {
      // Mock first query (pending) to return null
      mockQueryBuilder.first.mockResolvedValueOnce(null);
      // Mock second query (overdue) to return null
      mockQueryBuilder.first.mockResolvedValueOnce(null);

      const res = await request(app).post('/').send({ venta_id: 'venta-1', monto: 500 });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/No se encontraron pagos/i);
    });

    test('should handle 500 error in POST /', async () => {
      // Mock transaction to throw error
      mockDatabase.transaction.mockRejectedValueOnce(new Error('Unexpected DB Error'));

      const res = await request(app).post('/').send(paymentPayload);

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /:id Extended', () => {
    test('should forbid update if already paid', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: '123', estatus: 'pagado' });

      const res = await request(app).patch('/123').send({ notas: 'New note' });

      expect(res.status).toBe(403);
    });

    test('should return 400 if no valid fields provided', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: '123', estatus: 'pendiente' });

      const res = await request(app).patch('/123').send({ invalid_field: 'value' });

      expect(res.status).toBe(400);
    });

    test('should return 404 if pago not found', async () => {
      mockPagosService.readOne.mockResolvedValue(null);

      const res = await request(app).patch('/999').send({ notas: 'test' });

      expect(res.status).toBe(404);
    });

    test('should handle 500 error in PATCH /:id', async () => {
      mockPagosService.readOne.mockRejectedValueOnce(new Error('Unexpected Service Error'));

      const res = await request(app).patch('/123').send({ notas: 'Test' });

      expect(res.status).toBe(500);
    });
  });
});

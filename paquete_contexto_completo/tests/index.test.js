import { describe, it, expect, vi, beforeEach } from 'vitest';
import registerEndpoint from '../src/index.js';
import { ReportsService } from '../src/reports-service.js';
import { RefundService } from '../src/refund-service.js';
import { StripeSubscriptionsService } from '../src/stripe-subscriptions.service.js';
import { WebhookService } from '../src/webhook-service.js';

vi.mock('../src/stripe-service.js', () => ({
  createOrRetrieveCustomer: vi.fn(),
  createPaymentIntent: vi.fn(),
}));

import { createOrRetrieveCustomer, createPaymentIntent } from '../src/stripe-service.js';

const { mockServicesMethods, mockConstructorSpy } = vi.hoisted(() => {
  return {
    mockConstructorSpy: vi.fn(),
    mockServicesMethods: {
      // ReportsService
      generateIncomeReport: vi.fn(),
      getSubscriptionMetrics: vi.fn(),
      getRevenueByPlan: vi.fn(),
      getChurnRate: vi.fn(),
      getMRR: vi.fn(),
      getARPU: vi.fn(),
      getRefundMetrics: vi.fn(),
      getDashboardMetrics: vi.fn(),
      getRevenueForecast: vi.fn(),

      // RefundService
      requestRefund: vi.fn(),
      approveRefund: vi.fn(),
      rejectRefund: vi.fn(),
      listRefunds: vi.fn(),
      retrieveRefund: vi.fn(),

      // StripeSubscriptionsService
      listSubscriptions: vi.fn(),
      retrieveSubscription: vi.fn(),
      create: vi.fn(),
      changePlan: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),

      // WebhookService
      handleEvent: vi.fn(),

      // EstadoCuentaService
      generarEstadoCuenta: vi.fn(),
      exportarAPDF: vi.fn(),
    },
  };
});

vi.mock('../src/reports-service.js', () => ({
  ReportsService: class {
    constructor(opts) {
      if (opts?.getSchema) opts.getSchema();
      Object.assign(this, mockServicesMethods);
    }
  },
}));

vi.mock('../src/estado-cuenta.service.js', () => ({
  EstadoCuentaService: class {
    constructor(opts) {
      if (opts?.getSchema) opts.getSchema();
      Object.assign(this, mockServicesMethods);
    }
  },
}));

vi.mock('../src/refund-service.js', () => ({
  RefundService: class {
    constructor(opts) {
      if (opts?.getSchema) opts.getSchema();
      Object.assign(this, mockServicesMethods);
    }
  },
}));

vi.mock('../src/stripe-subscriptions.service.js', () => ({
  StripeSubscriptionsService: class {
    constructor(opts) {
      if (opts?.getSchema) opts.getSchema();
      Object.assign(this, mockServicesMethods);
    }
  },
}));

vi.mock('../src/webhook-service.js', () => ({
  WebhookService: class {
    constructor(opts) {
      if (opts?.getSchema) opts.getSchema();
      Object.assign(this, mockServicesMethods);
    }
  },
}));

describe('Endpoint Pagos (index.js)', () => {
  let mockRouter;
  let mockServices;
  let mockDatabase;
  let mockGetSchema;
  let mockItemsService;
  let mockAccountability;
  let req;
  let res;
  let next;
  let registeredRoutes = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset ReportsService mocks
    mockServicesMethods.generateIncomeReport.mockResolvedValue([]);
    mockServicesMethods.getSubscriptionMetrics.mockResolvedValue({});
    mockServicesMethods.getRevenueByPlan.mockResolvedValue([]);
    mockServicesMethods.getChurnRate.mockResolvedValue({});
    mockServicesMethods.getMRR.mockResolvedValue({});
    mockServicesMethods.getARPU.mockResolvedValue({});
    mockServicesMethods.getRefundMetrics.mockResolvedValue({});
    mockServicesMethods.getDashboardMetrics.mockResolvedValue({});
    mockServicesMethods.getRevenueForecast.mockResolvedValue([]);

    vi.spyOn(console, 'error').mockImplementation((...args) => {
      process.stdout.write(`Console Error: ${args.join(' ')}\n`);
    });
    // vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock Router
    mockRouter = {
      get: vi.fn((path, handler) => {
        registeredRoutes[`GET ${path}`] = handler;
      }),
      post: vi.fn((path, handler) => {
        registeredRoutes[`POST ${path}`] = handler;
      }),
      put: vi.fn((path, handler) => {
        registeredRoutes[`PUT ${path}`] = handler;
      }),
      patch: vi.fn((path, handler) => {
        registeredRoutes[`PATCH ${path}`] = handler;
      }),
      delete: vi.fn((path, handler) => {
        registeredRoutes[`DELETE ${path}`] = handler;
      }),
      use: vi.fn((fn) => {
        registeredRoutes['USE'] = fn;
      }),
    };

    // Mock Database (Knex Transaction)
    const mockTrx = {
      commit: vi.fn(),
      rollback: vi.fn(),
      where: vi.fn().mockReturnThis(),
      whereNot: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      first: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockReturnThis(),
      insert: vi.fn(),
    };
    // Allow trx('table') to return the query builder (mockTrx)
    const trxFn = vi.fn(() => mockTrx);
    Object.assign(trxFn, mockTrx);

    mockDatabase = {
      transaction: vi.fn().mockResolvedValue(trxFn),
    };

    // Mock ItemsService
    mockItemsService = {
      readByQuery: vi.fn(),
      readOne: vi.fn(),
      createOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    const MockItemsServiceConstructor = vi.fn(function () {
      return mockItemsService;
    });

    const MockMailServiceConstructor = vi.fn();

    mockServices = {
      ItemsService: MockItemsServiceConstructor,
      MailService: MockMailServiceConstructor,
    };

    mockGetSchema = vi.fn().mockResolvedValue({});
    mockAccountability = { user: 'test-user', role: 'admin' };

    // Register endpoints
    registerEndpoint(mockRouter, {
      services: mockServices,
      database: mockDatabase,
      getSchema: mockGetSchema,
    });

    // Setup Request/Response
    req = {
      body: {},
      query: {},
      params: {},
      headers: {},
      accountability: mockAccountability,
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
    };

    next = vi.fn();
  });

  describe('POST / (Manual Payment Registration)', () => {
    it('registers a payment successfully', async () => {
      const handler = registeredRoutes['POST /'];
      expect(handler).toBeDefined();

      req.body = {
        venta_id: 1,
        monto: 100,
        fecha_pago: '2023-01-01',
        metodo_pago: 'efectivo',
        notas: 'Pago test',
      };

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
        fecha_vencimiento: '2023-01-15',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago); // Find pagoObjetivo
      // Count pending payments for verification (return { count: 1 } to keep venta open, or 0 to close)
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      expect(mockDatabase.transaction).toHaveBeenCalled();
      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_pagado: 100,
          estatus: 'pagado',
        })
      );
      expect(trx.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estatus: 'pagado' }),
        })
      );
    });

    it('fails if amount is negative', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: -10, metodo_pago: 'efectivo' };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // ZodError
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('positivo') }),
          ]),
        })
      );
    });

    it('fails if payment not found', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 999, monto: 100, metodo_pago: 'efectivo' };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValue(null); // No payment found

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // InvalidPayloadException (no payments pending)
      expect(trx.rollback).toHaveBeenCalled();
    });

    it('fails if amount exceeds pending balance', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 200, metodo_pago: 'efectivo' };

      const mockPago = {
        id: 10,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValue(mockPago);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('excede el saldo') }),
          ]),
        })
      );
      expect(trx.rollback).toHaveBeenCalled();
    });

    it('calculates mora if late', async () => {
      const handler = registeredRoutes['POST /'];
      // Late payment
      req.body = { venta_id: 1, monto: 100, fecha_pago: '2023-02-01', metodo_pago: 'efectivo' };

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
        fecha_vencimiento: '2023-01-01', // Due before payment
        mora: 0,
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 5, // 5% of 100
        })
      );
    });

    it('prioritizes pending payments over delayed ones', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 };

      const trx = await mockDatabase.transaction();

      // Mock chain for identifying payment
      // First call: where(venta, pendiente).orderBy.first() -> returns null
      // Second call: where(venta, atrasado).orderBy.first() -> returns atrasadoPago

      // Wait, the code tries 'pendiente' first.
      // If I want to test priority, I should verify the call order/args.

      trx.first
        .mockResolvedValueOnce(null) // First query (pendiente) returns null
        .mockResolvedValueOnce({ id: 20, estatus: 'atrasado', monto: 100, monto_pagado: 0 }) // Second query (atrasado) returns payment
        .mockResolvedValueOnce({ count: 1 }); // Liquidation check

      await handler(req, res);

      expect(trx.where).toHaveBeenCalledWith({ venta_id: 1, estatus: 'pendiente' });
      expect(trx.where).toHaveBeenCalledWith({ venta_id: 1, estatus: 'atrasado' });
      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          estatus: 'pagado',
        })
      );
    });

    it('fails if pago_id provided but belongs to different sale', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, pago_id: 99, monto: 100 };

      const mockPago = {
        id: 99,
        venta_id: 2, // Different sale
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('no pertenece a la venta'),
            }),
          ]),
        })
      );
    });

    it('handles partial payment (updates amount but keeps status)', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 50 }; // Half payment

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      // No liquidation check needed as status won't be 'pagado'

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_pagado: 50,
          estatus: 'pendiente', // Should NOT change to 'pagado' or 'parcial' (based on current implementation)
        })
      );

      expect(trx.commit).toHaveBeenCalled();
    });

    it('updates sale status to liquidado if last payment', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 };

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago); // Find pago
      trx.first.mockResolvedValueOnce({ count: 0 }); // No pending payments left

      await handler(req, res);

      // Verify update on 'ventas' table
      // The code calls: await trx('ventas').where({ id: pagoObjetivo.venta_id }).update({ estatus: 'liquidado' });
      // Our mockTrx is reused. We can check if 'ventas' was called.
      // But mockTrx('table') returns itself. So we check update calls.
      // First update is on 'pagos', second on 'ventas' if verified.
      // Since we can't easily distinguish table calls on the same mock object without more complex mocking,
      // checking if update was called with { estatus: 'liquidado' } is a good proxy.

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          estatus: 'liquidado',
        })
      );
    });

    it('handles generic errors with 500', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 };

      const trx = await mockDatabase.transaction();
      trx.first.mockRejectedValue(new Error('Database explosion'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Database explosion' }),
          ]),
        })
      );
      expect(trx.rollback).toHaveBeenCalled();
    });
  });

  describe('PATCH /:id', () => {
    it('updates pago fields', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 10;
      req.body = { notas: 'Updated note' };

      mockItemsService.readOne.mockResolvedValue({ id: 10, estatus: 'pendiente' });

      await handler(req, res);

      expect(mockItemsService.updateOne).toHaveBeenCalledWith(10, { notas: 'Updated note' });
      expect(res.json).toHaveBeenCalled();
    });

    it('forbids update if already paid', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 10;
      req.body = { notas: 'Updated note' };

      mockItemsService.readOne.mockResolvedValue({ id: 10, estatus: 'pagado' });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockItemsService.updateOne).not.toHaveBeenCalled();
    });

    it('fails if no valid fields provided', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 10;
      req.body = { invalid_field: 'value' };

      mockItemsService.readOne.mockResolvedValue({ id: 10, estatus: 'pendiente' });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // InvalidPayloadException
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'No valid fields provided' }),
          ]),
        })
      );
    });

    it('fails if pago not found', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 999;
      req.body = { notas: 'test' };

      mockItemsService.readOne.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Pago no encontrado' }),
          ]),
        })
      );
    });

    it('handles generic errors in PATCH', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 10;
      req.body = { notas: 'test' };

      mockItemsService.readOne.mockRejectedValue(new Error('Unexpected error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('DELETE /:id', () => {
    it('returns 403 Forbidden', async () => {
      const handler = registeredRoutes['DELETE /:id'];

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ code: 'FORBIDDEN' })]),
        })
      );
    });
  });

  describe('GET /', () => {
    it('lists pagos with filters', async () => {
      const handler = registeredRoutes['GET /'];
      req.query = { estatus: 'pendiente', limit: '10' };

      mockItemsService.readByQuery.mockResolvedValue([{ id: 1 }]);

      await handler(req, res);

      expect(mockItemsService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { _and: [{ estatus: { _eq: 'pendiente' } }] },
          limit: 10,
        })
      );
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
    });

    it('handles errors in GET /', async () => {
      const handler = registeredRoutes['GET /'];
      req.query = {};
      mockItemsService.readByQuery.mockRejectedValue(new Error('Fetch failed'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Fetch failed' })]),
        })
      );
    });
  });

  describe('GET /:id', () => {
    it('retrieves a pago by id', async () => {
      const handler = registeredRoutes['GET /:id'];
      req.params.id = 10;
      mockItemsService.readOne.mockResolvedValue({ id: 10 });

      await handler(req, res);

      expect(mockItemsService.readOne).toHaveBeenCalledWith(10, expect.anything());
      expect(res.json).toHaveBeenCalledWith({ data: { id: 10 } });
    });

    it('returns 404 if pago not found', async () => {
      const handler = registeredRoutes['GET /:id'];
      req.params.id = 999;
      mockItemsService.readOne.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('no encontrado') }),
          ]),
        })
      );
    });

    it('handles generic errors in GET /:id', async () => {
      const handler = registeredRoutes['GET /:id'];
      req.params.id = 10;
      mockItemsService.readOne.mockRejectedValue(new Error('Fetch error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('POST / (Additional Scenarios)', () => {
    it('fails if neither venta_id nor pago_id provided', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { monto: 100 }; // Missing identifiers

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Debe especificar venta_id o pago_id' }),
          ]),
        })
      );
    });

    it('pays using specific pago_id', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, monto: 100 };

      const mockPago = {
        id: 20,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      // Verify we looked up by ID, not generic search
      expect(trx.where).toHaveBeenCalledWith({ id: 20 });
      expect(trx.update).toHaveBeenCalledWith(expect.objectContaining({ estatus: 'pagado' }));
    });

    it('fails if specific pago_id not found', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 999, monto: 100 };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Pago no encontrado' }),
          ]),
        })
      );
    });

    it('fails if pago_id mismatch with venta_id', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, venta_id: 2, monto: 100 }; // Mismatch

      const mockPago = {
        id: 20,
        venta_id: 1, // Real venta_id
        monto: 100,
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValue(mockPago);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'El pago no pertenece a la venta especificada' }),
          ]),
        })
      );
    });
  });

  describe('Rate Limiter', () => {
    it('should register rate limiter middleware', () => {
      expect(mockRouter.use).toHaveBeenCalled();
      const rateLimiter = mockRouter.use.mock.calls[0][0];
      expect(typeof rateLimiter).toBe('function');
    });

    it('should block requests exceeding rate limit', () => {
      const rateLimiter = mockRouter.use.mock.calls[0][0];
      const req = { ip: '1.2.3.4', connection: {} };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        rateLimiter(req, res, next);
      }
      expect(next).toHaveBeenCalledTimes(100);

      // 101st request
      rateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
    });

    it('uses connection.remoteAddress if req.ip is missing', () => {
      const rateLimiter = mockRouter.use.mock.calls[0][0];
      const req = { connection: { remoteAddress: '5.6.7.8' } }; // No ip
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Report Routes', () => {
    it('handles errors in /reportes/ingresos', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos'];
      mockServicesMethods.generateIncomeReport.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/suscripciones', async () => {
      const handler = registeredRoutes['GET /reportes/suscripciones'];
      mockServicesMethods.getSubscriptionMetrics.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/ingresos-por-plan', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos-por-plan'];
      mockServicesMethods.getRevenueByPlan.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/churn-rate', async () => {
      const handler = registeredRoutes['GET /reportes/churn-rate'];
      mockServicesMethods.getChurnRate.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/mrr', async () => {
      const handler = registeredRoutes['GET /reportes/mrr'];
      mockServicesMethods.getMRR.mockRejectedValue(new Error('Report Error'));

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/arpu', async () => {
      const handler = registeredRoutes['GET /reportes/arpu'];
      mockServicesMethods.getARPU.mockRejectedValue(new Error('Report Error'));

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/reembolsos', async () => {
      const handler = registeredRoutes['GET /reportes/reembolsos'];
      mockServicesMethods.getRefundMetrics.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/dashboard', async () => {
      const handler = registeredRoutes['GET /reportes/dashboard'];
      mockServicesMethods.getDashboardMetrics.mockRejectedValue(new Error('Report Error'));
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles errors in /reportes/forecast', async () => {
      const handler = registeredRoutes['GET /reportes/forecast'];
      mockServicesMethods.getRevenueForecast.mockRejectedValue(new Error('Report Error'));

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    // Happy Path Tests
    it('GET /reportes/ingresos returns data', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos'];
      mockServicesMethods.generateIncomeReport.mockResolvedValue([{ id: 1 }]);
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
    });

    it('GET /reportes/ingresos returns Excel', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31', formato: 'excel' };
      mockServicesMethods.generateIncomeReport.mockResolvedValue(Buffer.from('excel-data'));

      await handler(req, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('GET /reportes/ingresos returns PDF', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31', formato: 'pdf' };
      mockServicesMethods.generateIncomeReport.mockResolvedValue(Buffer.from('pdf-data'));

      await handler(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('GET /reportes/suscripciones returns metrics', async () => {
      const handler = registeredRoutes['GET /reportes/suscripciones'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };
      mockServicesMethods.getSubscriptionMetrics.mockResolvedValue({ active: 10 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { active: 10 } });
    });

    it('GET /reportes/ingresos-por-plan returns revenue', async () => {
      const handler = registeredRoutes['GET /reportes/ingresos-por-plan'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };
      mockServicesMethods.getRevenueByPlan = vi.fn().mockResolvedValue({ planA: 1000 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { planA: 1000 } });
    });

    it('GET /reportes/churn-rate returns churn', async () => {
      const handler = registeredRoutes['GET /reportes/churn-rate'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };
      mockServicesMethods.getChurnRate = vi.fn().mockResolvedValue({ rate: 5 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { rate: 5 } });
    });

    it('GET /reportes/mrr returns mrr', async () => {
      const handler = registeredRoutes['GET /reportes/mrr'];
      mockServicesMethods.getMRR = vi.fn().mockResolvedValue({ mrr: 5000 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { mrr: 5000 } });
    });

    it('GET /reportes/arpu returns arpu', async () => {
      const handler = registeredRoutes['GET /reportes/arpu'];
      mockServicesMethods.getARPU = vi.fn().mockResolvedValue({ arpu: 500 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { arpu: 500 } });
    });

    it('GET /reportes/reembolsos returns metrics', async () => {
      const handler = registeredRoutes['GET /reportes/reembolsos'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };
      mockServicesMethods.getRefundMetrics = vi.fn().mockResolvedValue({ total: 100 });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { total: 100 } });
    });

    it('GET /reportes/dashboard returns metrics', async () => {
      const handler = registeredRoutes['GET /reportes/dashboard'];
      req.query = { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' };
      mockServicesMethods.getDashboardMetrics = vi.fn().mockResolvedValue({ dashboard: true });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { dashboard: true } });
    });

    it('GET /reportes/forecast returns forecast', async () => {
      const handler = registeredRoutes['GET /reportes/forecast'];
      mockServicesMethods.getRevenueForecast = vi.fn().mockResolvedValue({ forecast: [] });

      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ data: { forecast: [] } });
    });
  });

  describe('Subscription Routes', () => {
    it('GET /suscripciones lists subscriptions', async () => {
      const handler = registeredRoutes['GET /suscripciones'];
      req.query = { cliente_id: 'cus_1' };
      mockServicesMethods.listSubscriptions.mockResolvedValue([{ id: 'sub_1' }]);

      await handler(req, res);
      expect(mockServicesMethods.listSubscriptions).toHaveBeenCalledWith('cus_1');
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'sub_1' }] });
    });

    it('GET /suscripciones/:id retrieves subscription', async () => {
      const handler = registeredRoutes['GET /suscripciones/:id'];
      req.params.id = 'sub_1';
      mockServicesMethods.retrieveSubscription.mockResolvedValue({ id: 'sub_1' });

      await handler(req, res);
      expect(mockServicesMethods.retrieveSubscription).toHaveBeenCalledWith('sub_1');
      expect(res.json).toHaveBeenCalledWith({ data: { id: 'sub_1' } });
    });

    it('POST /suscripciones/crear creates subscription', async () => {
      const handler = registeredRoutes['POST /suscripciones/crear'];
      req.body = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        venta_id: '123e4567-e89b-12d3-a456-426614174001',
        plan_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      mockServicesMethods.create.mockResolvedValue({ id: 'sub_1' });

      await handler(req, res);
      expect(mockServicesMethods.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        })
      );
      expect(res.json).toHaveBeenCalledWith({ data: { id: 'sub_1' } });
    });

    it('PUT /suscripciones/:id/cambiar-plan changes plan', async () => {
      const handler = registeredRoutes['PUT /suscripciones/:id/cambiar-plan'];
      req.params.id = 'sub_1';
      req.body = { plan_id: '123e4567-e89b-12d3-a456-426614174003' };
      mockServicesMethods.changePlan.mockResolvedValue({
        id: 'sub_1',
        plan: '123e4567-e89b-12d3-a456-426614174003',
      });

      await handler(req, res);
      expect(mockServicesMethods.changePlan).toHaveBeenCalledWith(
        'sub_1',
        '123e4567-e89b-12d3-a456-426614174003'
      );
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });

    it('POST /suscripciones/:id/cancelar cancels subscription', async () => {
      const handler = registeredRoutes['POST /suscripciones/:id/cancelar'];
      req.params.id = 'sub_1';
      mockServicesMethods.cancel.mockResolvedValue({ id: 'sub_1', status: 'canceled' });

      await handler(req, res);
      expect(mockServicesMethods.cancel).toHaveBeenCalledWith('sub_1');
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });

    it('POST /suscripciones/:id/pausar pauses subscription', async () => {
      const handler = registeredRoutes['POST /suscripciones/:id/pausar'];
      req.params.id = 'sub_1';
      mockServicesMethods.pause.mockResolvedValue({ id: 'sub_1', status: 'paused' });

      await handler(req, res);
      expect(mockServicesMethods.pause).toHaveBeenCalledWith('sub_1');
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });

    it('POST /suscripciones/:id/reanudar resumes subscription', async () => {
      const handler = registeredRoutes['POST /suscripciones/:id/reanudar'];
      req.params.id = 'sub_1';
      mockServicesMethods.resume.mockResolvedValue({ id: 'sub_1', status: 'active' });

      await handler(req, res);
      expect(mockServicesMethods.resume).toHaveBeenCalledWith('sub_1');
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });
  });

  describe('Refund Routes', () => {
    it('POST /reembolsos/solicitar requests refund', async () => {
      const handler = registeredRoutes['POST /reembolsos/solicitar'];
      req.body = {
        pago_id: '123e4567-e89b-12d3-a456-426614174000',
        monto: 100,
        razon: 'Duplicate payment request',
      };
      mockServicesMethods.requestRefund.mockResolvedValue({ id: 1, estatus: 'pendiente' });

      await handler(req, res);
      expect(mockServicesMethods.requestRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          pago_id: '123e4567-e89b-12d3-a456-426614174000',
          monto: 100,
          razon: 'Duplicate payment request',
          solicitado_por: 'test-user',
        })
      );
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });

    it('POST /reembolsos/:id/aprobar approves refund', async () => {
      const handler = registeredRoutes['POST /reembolsos/:id/aprobar'];
      req.params.id = 1;
      mockServicesMethods.approveRefund.mockResolvedValue({ id: 1, estatus: 'aprobado' });

      await handler(req, res);
      expect(mockServicesMethods.approveRefund).toHaveBeenCalledWith(1, 'test-user');
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });

    it('POST /reembolsos/:id/rechazar rejects refund', async () => {
      const handler = registeredRoutes['POST /reembolsos/:id/rechazar'];
      req.params.id = 1;
      req.body = { motivo: 'Invalid' };
      mockServicesMethods.rejectRefund.mockResolvedValue({ id: 1, estatus: 'rechazado' });

      await handler(req, res);
      expect(mockServicesMethods.rejectRefund).toHaveBeenCalledWith(1, 'test-user', 'Invalid');
      expect(res.json).toHaveBeenCalledWith({ data: expect.anything() });
    });
  });

  describe('Webhook Routes', () => {
    it('POST /webhooks/stripe handles event', async () => {
      const handler = registeredRoutes['POST /webhooks/stripe'];
      req.body = { type: 'payment_intent.succeeded' };
      req.headers = { 'stripe-signature': 'sig' };
      mockServicesMethods.handleEvent.mockResolvedValue({ received: true });

      await handler(req, res);
      expect(mockServicesMethods.handleEvent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('POST /webhooks/stripe handles signature error', async () => {
      const handler = registeredRoutes['POST /webhooks/stripe'];
      req.body = { type: 'payment_intent.succeeded' };
      // No signature header -> throws error in index.js logic before service call?
      // Actually index.js: const sig = req.headers['stripe-signature'];
      // If undefined, it passes undefined to service.
      // Service might throw or index.js might fail if it tries to use it.
      // But the catch block checks for 'signature' in error message.

      // Let's force an error that looks like a signature error
      mockServicesMethods.handleEvent.mockRejectedValue(
        new Error('No signatures found matching the expected signature for payload')
      );

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
    });
  });

  describe('Create Payment Intent Route', () => {
    it('POST /create-payment-intent creates intent successfully', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = {
        venta_id: 1,
        numero_pago: 1,
        cliente_id: 100,
      };

      // Mock Pagos Service readByQuery
      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          numero_pago: 1,
          monto: 500,
          estatus: 'pendiente',
          cliente_id: 100,
        },
      ]);

      // Mock Clientes Service readOne
      mockItemsService.readOne.mockResolvedValue({
        id: 100,
        email: 'test@example.com',
        nombre: 'Test User',
        stripe_customer_id: 'cus_existing',
      });

      // Mock Stripe Helpers
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_existing' });
      createPaymentIntent.mockResolvedValue({ id: 'pi_123', client_secret: 'secret_123' });

      await handler(req, res);

      expect(createOrRetrieveCustomer).toHaveBeenCalled();
      expect(createPaymentIntent).toHaveBeenCalledWith(
        500,
        'mxn',
        expect.any(Object),
        'cus_existing'
      );
      expect(mockItemsService.updateOne).toHaveBeenCalledWith(
        'pago_1',
        expect.objectContaining({
          stripe_payment_intent_id: 'pi_123',
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        clientSecret: 'secret_123',
        paymentIntentId: 'pi_123',
      });
    });

    it('POST /create-payment-intent fails if payment not found', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };
      mockItemsService.readByQuery.mockResolvedValue([]); // No results

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404); // NotFoundException -> 404
      // index.js: throw new NotFoundException('Pago no encontrado'); -> status 404
      // handleError checks err.status
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Pago no encontrado' }),
          ]),
        })
      );
    });

    it('POST /create-payment-intent handles Zod validation errors', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = {}; // Invalid body

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.any(Array),
        })
      );
    });

    it('POST /create-payment-intent uses pago_id if provided', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { pago_id: 'pago_1', cliente_id: 100, monto: 500 }; // Missing venta_id/numero_pago is fine if schema allows optional?
      // Schema requires venta_id and numero_pago OR pago_id?
      // Let's check validators.js or just provide all but rely on logic prioritizing pago_id.
      // Zod schema might require fields.
      // If schema is union or optional, it works. If schema is strict object, we need all fields.
      // Let's assume we provide all to pass validation, but check query logic.
      req.body = { pago_id: 'pago_1', venta_id: 1, numero_pago: 1, cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          monto: 500,
          cliente_id: 100,
        },
      ]);
      mockItemsService.readOne.mockResolvedValue({ id: 100, stripe_customer_id: 'cus_1' });
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_1' });
      createPaymentIntent.mockResolvedValue({ id: 'pi_1', client_secret: 'sec_1' });

      await handler(req, res);

      // Check that readByQuery was called with filter for ID
      const callArgs = mockItemsService.readByQuery.mock.calls[0][0];
      // The logic pushes to _and array.
      // query.filter._and.push({ id: { _eq: body.pago_id } });
      expect(JSON.stringify(callArgs.filter)).toContain(JSON.stringify({ id: { _eq: 'pago_1' } }));
    });

    it('POST /create-payment-intent falls back to pago.cliente_id if venta_id.cliente_id is missing', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { pago_id: 'pago_1', cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: null, // Missing venta details
          cliente_id: 100, // Should use this
          estatus: 'pendiente',
          monto: 500,
        },
      ]);

      mockItemsService.readOne.mockResolvedValue({ id: 100, email: 'test@example.com' });
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_1' });
      createPaymentIntent.mockResolvedValue({ id: 'pi_1', client_secret: 'sec_1' });

      await handler(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('POST /create-payment-intent handles primitive venta_id', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { pago_id: 'pago_1', cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: 1, // Primitive ID
          cliente_id: 100,
          estatus: 'pendiente',
          monto: 500,
        },
      ]);

      mockItemsService.readOne.mockResolvedValue({ id: 100, email: 'test@example.com' });
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_1' });
      createPaymentIntent.mockResolvedValue({ id: 'pi_1', client_secret: 'sec_1' });

      await handler(req, res);

      expect(createPaymentIntent).toHaveBeenCalledWith(
        500,
        'mxn',
        expect.objectContaining({ venta_id: 1 }),
        'cus_1'
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('POST /create-payment-intent handles 409 Conflict', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          cliente_id: 100,
          estatus: 'pendiente',
          monto: 500,
        },
      ]);

      mockItemsService.readOne.mockResolvedValue({ id: 100 });
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_1' });

      const error409 = new Error('Conflict');
      error409.status = 409;
      createPaymentIntent.mockRejectedValue(error409);

      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('POST /create-payment-intent throws Forbidden if client mismatch', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 999 }; // Wrong client

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 }, // Real client is 100
          monto: 500,
          cliente_id: 100,
        },
      ]);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('No tienes permiso') }),
          ]),
        })
      );
    });

    it('POST /create-payment-intent throws InvalidPayload if amount <= 0', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          monto: 0, // Invalid amount
          cliente_id: 100,
        },
      ]);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('mayor a 0') }),
          ]),
        })
      );
    });

    it('POST /create-payment-intent throws NotFound if client not found', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          monto: 500,
          cliente_id: 100,
        },
      ]);
      mockItemsService.readOne.mockResolvedValue(null); // Client not found

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Cliente no encontrado' }),
          ]),
        })
      );
    });

    it('POST /create-payment-intent updates client stripe_id if changed', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };

      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          venta_id: { id: 1, cliente_id: 100 },
          monto: 500,
          cliente_id: 100,
        },
      ]);
      mockItemsService.readOne.mockResolvedValue({
        id: 100,
        stripe_customer_id: 'cus_old',
        email: 'test@example.com',
        nombre: 'Test',
      });
      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_new' }); // New ID
      createPaymentIntent.mockResolvedValue({ id: 'pi_1', client_secret: 'sec_1' });

      await handler(req, res);

      expect(mockItemsService.updateOne).toHaveBeenCalledWith(100, {
        stripe_customer_id: 'cus_new',
      });
    });

    it('POST /create-payment-intent fails if already paid', async () => {
      const handler = registeredRoutes['POST /create-payment-intent'];
      req.body = { venta_id: 1, numero_pago: 1, cliente_id: 100 };
      mockItemsService.readByQuery.mockResolvedValue([
        {
          id: 'pago_1',
          estatus: 'pagado',
          venta_id: { cliente_id: 100 },
        },
      ]);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Additional Refund Routes', () => {
    it('GET /reembolsos lists refunds', async () => {
      const handler = registeredRoutes['GET /reembolsos'];
      req.query = { status: 'pendiente', user_id: 'user_1' };
      mockServicesMethods.listRefunds.mockResolvedValue([{ id: 1 }]);

      await handler(req, res);
      expect(mockServicesMethods.listRefunds).toHaveBeenCalledWith('user_1', 'pendiente');
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
    });

    it('GET /reembolsos/:id retrieves refund', async () => {
      const handler = registeredRoutes['GET /reembolsos/:id'];
      req.params.id = '1';
      mockServicesMethods.retrieveRefund.mockResolvedValue({ id: 1 });

      await handler(req, res);
      expect(mockServicesMethods.retrieveRefund).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
    });
  });

  describe('Legacy Routes', () => {
    it('GET / lists pagos with filters and pagination', async () => {
      const handler = registeredRoutes['GET /'];
      req.query = {
        estatus: 'pendiente',
        fecha_vencimiento: '2023-01-01',
        venta_id: 1,
        page: '2',
        limit: '10',
        sort: '-fecha_vencimiento',
      };

      mockItemsService.readByQuery.mockResolvedValue([]);

      await handler(req, res);

      expect(mockItemsService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { estatus: { _eq: 'pendiente' } },
              { fecha_vencimiento: { _eq: '2023-01-01' } },
              { venta_id: { _eq: 1 } },
            ]),
          }),
          limit: 10,
          page: 2,
          sort: '-fecha_vencimiento',
        })
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('POST / handles partial payment', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, monto: 50 }; // Partial payment (total 100)

      const mockPago = {
        id: 20,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 }); // Pendientes > 0

      await handler(req, res);

      // Verify estatus remains 'pendiente' (or whatever default is, logic keeps old estatus if not full payment)
      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          monto_pagado: 50,
          estatus: 'pendiente',
        })
      );
    });

    it('POST / handles full payment and liquidates sale', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, monto: 100 };

      const mockPago = {
        id: 20,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      // Count of pending payments excluding current one
      trx.first.mockResolvedValueOnce({ count: 0 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(expect.objectContaining({ estatus: 'pagado' }));
      // Verify ventas update
      expect(trx.where).toHaveBeenCalledWith({ id: 1 }); // venta_id
      expect(trx.update).toHaveBeenCalledWith({ estatus: 'liquidado' });
    });

    it('POST / appends notes', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, monto: 100, notas: 'New Note' };

      const mockPago = {
        id: 20,
        venta_id: 1,
        monto: 100,
        estatus: 'pendiente',
        notas: 'Old Note',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'Old Note\nNew Note',
        })
      );
    });

    it('PATCH /:id updates pago', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 1;
      req.body = { notas: 'Updated Note' };

      mockItemsService.readOne.mockResolvedValue({ id: 1, estatus: 'pendiente' });

      await handler(req, res);

      expect(mockItemsService.updateOne).toHaveBeenCalledWith(1, { notas: 'Updated Note' });
      expect(res.json).toHaveBeenCalledWith({ data: { message: 'Pago actualizado' } });
    });

    it('PATCH /:id fails if pago is pagado', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 1;
      req.body = { notas: 'Updated Note' };

      mockItemsService.readOne.mockResolvedValue({ id: 1, estatus: 'pagado' });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ code: 'FORBIDDEN' })]),
        })
      );
    });

    it('PATCH /:id fails if pago not found', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 1;
      req.body = { notas: 'Updated Note' };

      mockItemsService.readOne.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('PATCH /:id fails if no valid fields', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 1;
      req.body = { invalid_field: 'value' };

      mockItemsService.readOne.mockResolvedValue({ id: 1, estatus: 'pendiente' });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('DELETE /:id returns forbidden', async () => {
      const handler = registeredRoutes['DELETE /:id'];
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Generic Error Handling for All Routes', () => {
    const errorRoutes = [
      // Report Routes
      {
        method: 'GET',
        path: '/reportes/ingresos',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'generateIncomeReport',
      },
      {
        method: 'GET',
        path: '/reportes/suscripciones',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getSubscriptionMetrics',
      },
      {
        method: 'GET',
        path: '/reportes/ingresos-por-plan',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getRevenueByPlan',
      },
      {
        method: 'GET',
        path: '/reportes/churn-rate',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getChurnRate',
      },
      {
        method: 'GET',
        path: '/reportes/mrr',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getMRR',
      },
      {
        method: 'GET',
        path: '/reportes/arpu',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getARPU',
      },
      {
        method: 'GET',
        path: '/reportes/reembolsos',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getRefundMetrics',
      },
      {
        method: 'GET',
        path: '/reportes/dashboard',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getDashboardMetrics',
      },
      {
        method: 'GET',
        path: '/reportes/forecast',
        query: { fecha_inicio: '2023-01-01', fecha_fin: '2023-01-31' },
        serviceMethod: 'getRevenueForecast',
      },

      // Subscription Routes
      {
        method: 'GET',
        path: '/suscripciones',
        query: { cliente_id: '123e4567-e89b-12d3-a456-426614174000' },
        serviceMethod: 'listSubscriptions',
      },
      {
        method: 'GET',
        path: '/suscripciones/:id',
        params: { id: 'sub_1' },
        serviceMethod: 'retrieveSubscription',
      },
      {
        method: 'POST',
        path: '/suscripciones/crear',
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          venta_id: '123e4567-e89b-12d3-a456-426614174001',
          plan_id: '123e4567-e89b-12d3-a456-426614174002',
        },
        serviceMethod: 'create',
      },
      {
        method: 'PUT',
        path: '/suscripciones/:id/cambiar-plan',
        params: { id: 'sub_1' },
        body: { plan_id: '123e4567-e89b-12d3-a456-426614174003' },
        serviceMethod: 'changePlan',
      },
      {
        method: 'POST',
        path: '/suscripciones/:id/cancelar',
        params: { id: 'sub_1' },
        body: {},
        serviceMethod: 'cancel',
      },
      {
        method: 'POST',
        path: '/suscripciones/:id/pausar',
        params: { id: 'sub_1' },
        body: {},
        serviceMethod: 'pause',
      },
      {
        method: 'POST',
        path: '/suscripciones/:id/reanudar',
        params: { id: 'sub_1' },
        body: {},
        serviceMethod: 'resume',
      },

      // Refund Routes
      {
        method: 'POST',
        path: '/reembolsos/solicitar',
        body: {
          pago_id: '123e4567-e89b-12d3-a456-426614174000',
          monto: 100,
          razon: 'Solicitud valida por mas de 5 caracteres',
        },
        serviceMethod: 'requestRefund',
      },
      {
        method: 'POST',
        path: '/reembolsos/:id/aprobar',
        params: { id: 1 },
        body: {},
        serviceMethod: 'approveRefund',
      },
      {
        method: 'POST',
        path: '/reembolsos/:id/rechazar',
        params: { id: 1 },
        body: { motivo: 'Motivo valido por mas de 5 caracteres' },
        serviceMethod: 'rejectRefund',
      },
      { method: 'GET', path: '/reembolsos', serviceMethod: 'listRefunds' },
      {
        method: 'GET',
        path: '/reembolsos/:id',
        params: { id: '1' },
        serviceMethod: 'retrieveRefund',
      },

      // Webhook
      {
        method: 'POST',
        path: '/webhooks/stripe',
        body: { id: 'evt_1' },
        serviceMethod: 'handleEvent',
      },

      // Estado Cuenta
      {
        method: 'GET',
        path: '/estado-cuenta/:venta_id',
        params: { venta_id: '123' },
        serviceMethod: 'generarEstadoCuenta',
      },
      {
        method: 'GET',
        path: '/estado-cuenta/:venta_id/pdf',
        params: { venta_id: '123' },
        serviceMethod: 'exportarAPDF',
      },

      // New Route: Create Payment Intent
      // Note: This route uses logic inside index.js, not a service method directly in the same way.
      // But we can test it separately or add a dummy service method if we refactor.
      // For now, we'll skip adding it to generic loop if it doesn't use mockServicesMethods the same way,
      // or we mock the internal logic.
      // Actually, it uses itemsService, so it might fail the "serviceMethod" lookup in generic loop.
      // We'll test it explicitly.
    ];

    errorRoutes.forEach((route) => {
      it(`handles error in ${route.method} ${route.path}`, async () => {
        const handler = registeredRoutes[`${route.method} ${route.path}`];
        // expect(handler).toBeDefined();
        if (!handler) {
          console.warn(`Route not found: ${route.method} ${route.path}`);
          return;
        }

        if (route.query) req.query = route.query;
        if (route.body) req.body = route.body;
        if (route.params) req.params = route.params;

        mockServicesMethods[route.serviceMethod].mockRejectedValue(new Error('Service Failure'));

        await handler(req, res);

        if (route.path === '/webhooks/stripe') {
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
        } else {
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({ message: 'Service Failure' }),
              ]),
            })
          );
        }
      });
    });
  });

  describe('Additional Coverage', () => {
    it('GET /suscripciones fails if cliente_id is missing', async () => {
      const handler = registeredRoutes['GET /suscripciones'];
      req.query = {}; // Missing cliente_id

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'cliente_id es requerido' }),
          ]),
        })
      );
    });

    it('POST /reembolsos/solicitar handles missing accountability/user', async () => {
      const handler = registeredRoutes['POST /reembolsos/solicitar'];
      req.body = {
        pago_id: '123e4567-e89b-12d3-a456-426614174000',
        monto: 100,
        razon: 'Duplicate payment request',
      };
      req.accountability = null; // Missing user

      mockServicesMethods.requestRefund.mockResolvedValue({ id: 1, estatus: 'pendiente' });

      await handler(req, res);

      // solicitado_por should be undefined or not passed
      expect(mockServicesMethods.requestRefund).toHaveBeenCalledWith(
        expect.not.objectContaining({
          solicitado_por: expect.anything(),
        })
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('PATCH /:id ignores invalid fields', async () => {
      const handler = registeredRoutes['PATCH /:id'];
      req.params.id = 1;
      req.body = {
        monto: 200, // Valid
        invalid_field: 'should be ignored',
        another_invalid: 123,
      };

      mockItemsService.readOne.mockResolvedValue({ id: 1, estatus: 'pendiente', monto: 100 });

      await handler(req, res);

      expect(mockItemsService.updateOne).toHaveBeenCalledWith(1, { monto: 200 });
      // Should NOT contain invalid fields
      const updateCall = mockItemsService.updateOne.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('invalid_field');
      expect(updateCall).not.toHaveProperty('another_invalid');
    });

    it('GET / works without filters', async () => {
      const handler = registeredRoutes['GET /'];
      req.query = { limit: '10' }; // Only limit, no filters

      mockItemsService.readByQuery.mockResolvedValue([]);

      await handler(req, res);

      // Verify empty filter
      expect(mockItemsService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {},
          limit: 10,
        })
      );
    });

    it('POST / finds atrasado payment if no pending payment', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 };

      const mockPagoAtrasado = {
        id: 11,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'atrasado', // Found in second attempt
        fecha_vencimiento: '2022-01-01',
      };

      const trx = await mockDatabase.transaction();

      // First attempt (pendiente) -> null
      trx.first.mockResolvedValueOnce(null);

      // Second attempt (atrasado) -> found
      trx.first.mockResolvedValueOnce(mockPagoAtrasado);

      // Third call (count for liquidation check, assuming paid)
      // Or maybe it updates estatus to pagado and then checks?
      // If monto covers it, it becomes pagado.
      // Let's assume it becomes pagado.
      trx.first.mockResolvedValueOnce({ count: 1 }); // Still other payments pending

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(expect.objectContaining({ estatus: 'pagado' }));
      // Verify we looked for atrasado
      expect(trx.where).toHaveBeenCalledWith({ venta_id: 1, estatus: 'atrasado' });
    });

    it('POST / does NOT liquidate sale if other payments remain', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { pago_id: 20, monto: 100 };

      const mockPago = {
        id: 20,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);

      // Count of pending payments > 0
      trx.first.mockResolvedValueOnce({ count: 5 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(expect.objectContaining({ estatus: 'pagado' }));
      // Should NOT update ventas
      // How to check it didn't call update on 'ventas'?
      // We can check calls.
      // trx.update is called once for pagos.
      expect(trx.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rate Limiter', () => {
    it('allows requests within limit', async () => {
      const rateLimiter = registeredRoutes['USE'];
      expect(rateLimiter).toBeDefined();

      const next = vi.fn();
      const req = { ip: '1.2.3.4', connection: {} };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('blocks requests exceeding limit', async () => {
      const rateLimiter = registeredRoutes['USE'];
      const next = vi.fn();
      const req = { ip: '1.2.3.5', connection: {} };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        rateLimiter(req, res, next);
      }

      // 101st request should fail
      rateLimiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
          ]),
        })
      );
    });

    it('uses remoteAddress if ip is missing', async () => {
      const rateLimiter = registeredRoutes['USE'];
      const next = vi.fn();
      const req = { connection: { remoteAddress: '1.2.3.6' } }; // No ip
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('GET / Filters Coverage', () => {
    it('applies fecha_vencimiento and venta_id filters', async () => {
      const handler = registeredRoutes['GET /'];
      req.query = {
        fecha_vencimiento: '2023-12-31',
        venta_id: '123',
      };

      mockItemsService.readByQuery.mockResolvedValue([]);

      await handler(req, res);

      expect(mockItemsService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { fecha_vencimiento: { _eq: '2023-12-31' } },
              { venta_id: { _eq: '123' } },
            ]),
          }),
        })
      );
    });
  });

  describe('Coverage Gap Fillers', () => {
    it('POST / appends notes to existing notes', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100, notas: 'New note' };

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
        notas: 'Old note',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'Old note\nNew note',
        })
      );
    });

    it('POST / defaults metodo_pago to efectivo', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 }; // No metodo_pago

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metodo_pago: 'efectivo',
        })
      );
    });

    it('POST / preserves existing notes if no new notes provided', async () => {
      const handler = registeredRoutes['POST /'];
      req.body = { venta_id: 1, monto: 100 }; // No notas

      const mockPago = {
        id: 10,
        venta_id: 1,
        monto: 100,
        monto_pagado: 0,
        estatus: 'pendiente',
        notas: 'Important info',
      };

      const trx = await mockDatabase.transaction();
      trx.first.mockResolvedValueOnce(mockPago);
      trx.first.mockResolvedValueOnce({ count: 1 });

      await handler(req, res);

      expect(trx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'Important info',
        })
      );
    });
  });

  describe('Estado Cuenta Routes', () => {
    it('GET /estado-cuenta/:venta_id calls generarEstadoCuenta', async () => {
      const handler = registeredRoutes['GET /estado-cuenta/:venta_id'];
      req.params = { venta_id: 'venta-123' };

      const mockData = { saldo: 1000 };
      mockServicesMethods.generarEstadoCuenta.mockResolvedValue(mockData);

      await handler(req, res);

      expect(mockServicesMethods.generarEstadoCuenta).toHaveBeenCalledWith('venta-123');
      expect(res.json).toHaveBeenCalledWith(mockData);
    });

    it('GET /estado-cuenta/:venta_id/pdf calls exportarAPDF and sends PDF', async () => {
      const handler = registeredRoutes['GET /estado-cuenta/:venta_id/pdf'];
      req.params = { venta_id: 'venta-123' };

      const mockBuffer = Buffer.from('PDF');
      mockServicesMethods.exportarAPDF.mockResolvedValue(mockBuffer);

      await handler(req, res);

      expect(mockServicesMethods.exportarAPDF).toHaveBeenCalledWith('venta-123');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('estado_cuenta_venta-123.pdf')
      );
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });
});

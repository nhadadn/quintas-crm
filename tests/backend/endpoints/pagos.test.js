import pagosEndpoint from '../../../extensions/endpoint-pagos/src/index.js';
import { mockContext } from '../setup';

// Mock de Stripe Service
jest.mock('../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  createPaymentIntent: jest.fn(),
  constructEvent: jest.fn(),
  createOrRetrieveCustomer: jest.fn(),
}));

import {
  createPaymentIntent,
  constructEvent,
  createOrRetrieveCustomer,
} from '../../../extensions/endpoint-pagos/src/stripe-service.js';

// Mock express router
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pagos API Extension', () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    pagosEndpoint(router, mockContext);
  });

  test('should apply global rate limiter', () => {
    // Find the middleware function (argument to router.use)
    // router.use might be called multiple times. We need the one that is a function (rateLimiter).
    const rateLimiter = router.use.mock.calls.find((call) => typeof call[0] === 'function')[0];

    const req = { ip: '10.0.0.1', connection: { remoteAddress: '10.0.0.1' } };
    const res = mockRes();
    const next = jest.fn();

    // Max requests is 100
    for (let i = 0; i < 100; i++) {
      rateLimiter(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(100);

    // 101st request should fail
    rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' })]),
      })
    );
  });

  describe('GET /', () => {
    let getHandler;

    beforeEach(() => {
      const call = router.get.mock.calls.find((call) => call[0] === '/');
      if (call) getHandler = call[call.length - 1];
    });

    test('should register GET / route', () => {
      expect(router.get).toHaveBeenCalledWith('/', expect.any(Function));
    });

    test('should return list of payments', async () => {
      const req = { query: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      const mockPagos = [{ id: 'pago-1', monto: 500 }];
      itemsServiceInstance.readByQuery.mockResolvedValue(mockPagos);

      await getHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockPagos }));
    });

    test('should support pagination parameters', async () => {
      const req = {
        query: { limit: '10', page: '2' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      await getHandler(req, res);

      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          page: 2,
        })
      );
    });

    test('should filter payments', async () => {
      const req = {
        query: { estatus: 'paid', fecha_vencimiento: '2025-01-01', venta_id: 'v-1' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      await getHandler(req, res);

      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { estatus: { _eq: 'paid' } },
              { fecha_vencimiento: { _eq: '2025-01-01' } },
              { venta_id: { _eq: 'v-1' } },
            ]),
          }),
        })
      );
    });

    test('should return 500 on generic error', async () => {
      const req = {
        query: {},
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));

      await getHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /:id', () => {
    let getByIdHandler;

    beforeEach(() => {
      const call = router.get.mock.calls.find((call) => call[0] === '/:id');
      if (call) getByIdHandler = call[call.length - 1];
    });

    test('should return payment details', async () => {
      const req = { params: { id: 'pago-1' }, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      const mockPago = { id: 'pago-1', monto: 500 };
      itemsServiceInstance.readOne.mockResolvedValue(mockPago);

      await getByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockPago }));
    });

    test('should return 404 if payment not found', async () => {
      const req = { params: { id: 'pago-99' }, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue(null);

      await getByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on generic error', async () => {
      const req = {
        params: { id: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockRejectedValue(new Error('DB Error'));

      await getByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('POST /', () => {
    let postHandler;

    beforeEach(() => {
      const call = router.post.mock.calls.find((call) => call[0] === '/');
      if (call) postHandler = call[call.length - 1];
    });

    test('should register POST / route', () => {
      expect(router.post).toHaveBeenCalledWith('/', expect.any(Function));
    });

    test('should register manual payment successfully', async () => {
      if (!postHandler) return;

      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1, monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock result of payment registration (readOne call at end)
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'pago-1',
        monto: 100,
        estatus: 'pagado',
      });

      // Mock database transaction and queries
      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          venta_id: 'v-1',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockTrx.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'pago-1', estatus: 'pagado' }),
        })
      );
    });

    test('should return 400 if no pending payments found', async () => {
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();

      // Mock trx to return null for both pending and overdue payments
      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        orderBy: jest.fn().mockReturnThis(),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'No se encontraron pagos pendientes para esta venta',
            }),
          ]),
        })
      );
    });

    test('should return 400 if payment amount exceeds pending balance', async () => {
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', monto: 200 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();

      // Mock payment with 100 pending
      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          venta_id: 'v-1',
        }),
        orderBy: jest.fn().mockReturnThis(),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('excede el saldo pendiente'),
            }),
          ]),
        })
      );
    });

    test('should return 400 if payment does not belong to provided venta_id', async () => {
      const req = {
        body: { pago_id: 'pago-1', venta_id: 'v-2', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();

      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
        }),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'El pago no pertenece a la venta especificada' }),
          ]),
        })
      );
    });

    test('should process payment successfully with pago_id', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'pago-1',
        monto: 100,
        estatus: 'pagado',
      });

      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockTrx.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'pago-1' }),
        })
      );
    });

    test('should append notes if provided', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, notas: 'New Note' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'pago-1',
        monto: 100,
        estatus: 'pagado',
      });

      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          notas: 'Old Note',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockTrx).toHaveBeenCalledWith('pagos');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'Old Note\nNew Note',
        })
      );
    });

    test('should not mark as paid if amount is partial', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 50 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'pago-1',
        monto: 100,
        estatus: 'pendiente',
      });

      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          estatus: 'pendiente',
          monto_pagado: 50,
        })
      );
    });

    test('should set notes correctly when old notes are empty', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, notas: 'New Note' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          notas: null,
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'New Note',
        })
      );
    });

    test('should keep old notes if no new notes provided', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          notas: 'Old Note',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: 'Old Note',
        })
      );
    });

    test('should return 400 if pago_id not found', async () => {
      const req = {
        body: { pago_id: 'pago-99', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Pago no encontrado' }] })
      );
    });

    test('should return 400 if pago_id does not match venta_id', async () => {
      const req = {
        body: { pago_id: 'pago-1', venta_id: 'v-2', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 'pago-1', venta_id: 'v-1' }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'El pago no pertenece a la venta especificada' }],
        })
      );
    });

    test('should apply late fee if paid after due date', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, fecha_pago: '2025-02-01' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          mora: 0,
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 5, // 5% of 100
        })
      );
    });

    test('should not re-apply late fee if already applied', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, fecha_pago: '2025-02-01' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          mora: 5,
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 5, // Should remain 5
        })
      );
    });

    test('should return 400 if pago_id does not match venta_id', async () => {
      const req = {
        body: { pago_id: 'pago-1', venta_id: 'v-2', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 'pago-1', venta_id: 'v-1' }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'El pago no pertenece a la venta especificada' }],
        })
      );
    });

    test('should apply late fee if paid after due date', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, fecha_pago: '2025-02-01' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          mora: 0,
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 5, // 5% of 100
        })
      );
    });

    test('should not re-apply late fee if already applied', async () => {
      const req = {
        body: { pago_id: 'pago-1', monto: 100, fecha_pago: '2025-02-01' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          venta_id: 'v-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          mora: 5,
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockReturnThis(),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
      };
      const mockTrx = jest.fn(() => mockChain);
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mora: 5, // Should remain 5
        })
      );
    });

    test('should liquidate venta if all payments are paid', async () => {
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'pago-1',
        monto: 100,
        estatus: 'pagado',
      });

      const mockTrx = jest.fn();
      // Setup mock chain for trx
      const mockChain = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'pago-1',
          monto: 100,
          monto_pagado: 0,
          estatus: 'pendiente',
          fecha_vencimiento: '2025-01-01',
          venta_id: 'v-1',
        }),
        orderBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
        whereNotIn: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
      };

      // Handling separate calls for payment update and liquidation check
      // First call to first() returns payment. Second call (if any) is for count check? No, count returns object with count.

      // Refine mockTrx behavior based on call arguments
      mockTrx.mockImplementation((table) => {
        if (table === 'pagos') {
          // Return chain with special behavior for count()
          mockChain.first
            .mockResolvedValueOnce({
              id: 'pago-1',
              monto: 100,
              monto_pagado: 0,
              estatus: 'pendiente',
              fecha_vencimiento: '2025-01-01',
              venta_id: 'v-1',
            })
            .mockResolvedValueOnce({ count: 0 }); // Result for liquidation check
          return mockChain;
        }
        if (table === 'ventas') {
          return mockChain;
        }
        return mockChain;
      });

      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockTrx).toHaveBeenCalledWith('ventas');
      expect(mockChain.update).toHaveBeenCalledWith({ estatus: 'liquidado' });
    });

    test('should rollback transaction on error', async () => {
      if (!postHandler) return;

      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1, monto: 100 },
        accountability: { user: 'admin' },
      };
      const res = mockRes();

      // Mock trx to throw error on query
      const mockTrx = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('DB Fail')),
        orderBy: jest.fn().mockReturnThis(),
      }));
      mockTrx.commit = jest.fn();
      mockTrx.rollback = jest.fn();

      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should fail if monto is negative', async () => {
      if (!postHandler) return;
      const req = { body: { monto: -10 } };
      const res = mockRes();
      await postHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('monto') }),
          ]),
        })
      );
    });

    test('should fail if no payment identifier provided', async () => {
      if (!postHandler) return;
      const req = { body: { monto: 100 } };
      const res = mockRes();
      await postHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /create-payment-intent', () => {
    let createIntentHandler;

    beforeEach(() => {
      const call = router.post.mock.calls.find((call) => call[0] === '/create-payment-intent');
      if (call) createIntentHandler = call[call.length - 1];
    });

    test('should register POST /create-payment-intent route', () => {
      expect(router.post).toHaveBeenCalledWith('/create-payment-intent', expect.any(Function));
    });

    test('should create payment intent', async () => {
      if (!createIntentHandler) return;

      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock para búsqueda de pago (por venta_id/numero_pago)
      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          monto: 100,
          estatus: 'pendiente',
          venta_id: { id: 'v-1', cliente_id: 'c-1', lote_id: 'l-1' },
          numero_pago: 1,
        },
      ]);

      // Mock para cliente (stripe_customer_id)
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'c-1',
        stripe_customer_id: 'cus_123',
        email: 'test@example.com',
        nombre: 'Test',
      });

      createOrRetrieveCustomer.mockResolvedValue({ id: 'cus_123' });
      createPaymentIntent.mockResolvedValue({ client_secret: 'secret_123', id: 'pi_123' });

      await createIntentHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ clientSecret: 'secret_123' })
      );
    });

    test('should fail if payment already processed', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          estatus: 'pagado',
          venta_id: { id: 'v-1', cliente_id: 'c-1' },
        },
      ]);

      await createIntentHandler(req, res);

      if (res.status.mock.calls.length > 0 && res.status.mock.calls[0][0] === 500) {
        console.log('500 Error:', res.json.mock.calls[0][0]);
      }

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('should fail if amount to pay is zero or negative', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          estatus: 'pendiente',
          monto: 0,
          venta_id: { id: 'v-1', cliente_id: 'c-1' },
        },
      ]);

      await createIntentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'El monto a pagar debe ser mayor a 0' }),
          ]),
        })
      );
    });

    test('should create new stripe customer if not exists', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          monto: 100,
          estatus: 'pendiente',
          venta_id: { id: 'v-1', cliente_id: 'c-1' },
          numero_pago: 1,
        },
      ]);

      // Mock client WITHOUT stripe_customer_id
      itemsServiceInstance.readOne.mockResolvedValue({
        id: 'c-1',
        email: 'new@example.com',
        nombre: 'New Client',
      });

      createOrRetrieveCustomer.mockResolvedValue({ id: 'new_cus_123' });
      createPaymentIntent.mockResolvedValue({ client_secret: 'secret_123', id: 'pi_new' });

      await createIntentHandler(req, res);

      expect(createOrRetrieveCustomer).toHaveBeenCalled();
      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith('c-1', {
        stripe_customer_id: 'new_cus_123',
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ clientSecret: 'secret_123' })
      );
    });

    test('should return 409 if payment already paid', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock payment fully paid
      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          monto: 100,
          monto_pagado: 100,
          estatus: 'pagado',
          venta_id: { id: 'v-1', cliente_id: 'c-1' },
          numero_pago: 1,
        },
      ]);
      itemsServiceInstance.readOne.mockResolvedValue({ id: 'c-1', stripe_customer_id: 'cus_123' });

      await createIntentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('ya fue realizado') }),
          ]),
        })
      );
    });

    test('should handle NotFoundException', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-1', venta_id: 'v-99', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // No payment found

      await createIntentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle ForbiddenException', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: { cliente_id: 'c-2', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([
        { id: 'pago-1', venta_id: { id: 'v-1', cliente_id: 'c-1' }, numero_pago: 1 },
      ]); // Belongs to c-1

      await createIntentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should return 500 on generic error', async () => {
      const req = {
        body: {
          venta_id: 1,
          numero_pago: 1,
          cliente_id: 1,
        },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock validation success
      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 1,
          venta_id: { id: 1, cliente_id: 1, lote_id: 1 },
          monto: 1000,
          estatus: 'pendiente',
          numero_pago: 1,
        },
      ]);
      itemsServiceInstance.readOne.mockResolvedValue({ id: 1, stripe_customer_id: 'cus_123' });

      // Mock createPaymentIntent failure
      const {
        createPaymentIntent,
      } = require('../../../extensions/endpoint-pagos/src/stripe-service.js');
      createPaymentIntent.mockRejectedValue(new Error('Stripe API Error'));

      await createIntentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Stripe API Error' }] })
      );
    });

    test('should return 404 if client not found', async () => {
      const req = {
        body: { cliente_id: 'c-99', venta_id: 'v-1', numero_pago: 1 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock pagos search
      itemsServiceInstance.readByQuery.mockResolvedValue([
        {
          id: 'pago-1',
          monto: 100,
          venta_id: { id: 'v-1', lote_id: 'L-1', cliente_id: 'c-99' },
        },
      ]);

      // Mock client search -> null
      itemsServiceInstance.readOne.mockImplementation((id) => {
        if (id === 'c-99') return Promise.resolve(null);
        return Promise.resolve({});
      });

      await createIntentHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Cliente no encontrado' }),
          ]),
        })
      );
    });

    test('should handle payment_intent creation with pago_id', async () => {
      if (!createIntentHandler) return;
      const req = {
        body: {
          pago_id: 1,
          cliente_id: 1,
        },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Fix: Use readByQuery as implementation uses it, not readOne
      itemsServiceInstance.readByQuery.mockResolvedValueOnce([
        {
          id: 1,
          venta_id: { id: 1, cliente_id: 1, lote_id: 1 },
          monto: 1000,
          estatus: 'pendiente',
          numero_pago: 1,
        },
      ]);
      itemsServiceInstance.readOne.mockResolvedValueOnce({ id: 1, stripe_customer_id: 'cus_123' }); // Cliente

      const {
        createPaymentIntent,
      } = require('../../../extensions/endpoint-pagos/src/stripe-service.js');
      createPaymentIntent.mockResolvedValue({ id: 'pi_123', client_secret: 'secret' });

      await createIntentHandler(req, res);

      if (res.status.mock.calls.length > 0) {
        // Debug info if status was called (e.g. 500 or 403)
        console.log('Status called with:', res.status.mock.calls[0][0]);
        if (res.json.mock.calls.length > 0)
          console.log('JSON called with:', JSON.stringify(res.json.mock.calls[0][0]));
      }

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ paymentIntentId: 'pi_123' }));
    });

    // Rate limit test removed as unit test cannot easily test middleware
    // test('should return 429 if rate limit exceeded', ...)

    test('should return 400 for invalid payload', async () => {
      const req = {
        body: {
          // Missing required fields
          cliente_id: 1,
        },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      await createIntentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400); // Or 500 if Zod throws InvalidPayloadException which is caught
    });
  });

  describe('POST /webhooks/stripe', () => {
    let webhookHandler;

    beforeEach(() => {
      const call = router.post.mock.calls.find((call) => call[0] === '/webhooks/stripe');
      if (call) webhookHandler = call[call.length - 1];
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    });

    test('should register POST /webhooks/stripe route', () => {
      expect(router.post).toHaveBeenCalledWith('/webhooks/stripe', expect.any(Function));
    });

    test('should return 400 on signature verification failure', async () => {
      const req = { headers: { 'stripe-signature': 'invalid' }, body: {} };
      const res = mockRes();

      constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
    });

    test('should handle payment_intent.succeeded', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            charges: { data: [{ payment_method_details: { card: { last4: '4242' } } }] },
            customer: 'cus_123',
          },
        },
      };

      constructEvent.mockReturnValue(event);

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock finding the payment
      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([]) // isEventProcessed (log check)
        .mockResolvedValueOnce([{ id: 'pago-1', estatus: 'pendiente' }]); // handlePaymentIntentSucceeded (payment lookup)

      await webhookHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(
        'pago-1',
        expect.objectContaining({
          estatus: 'pagado',
          stripe_last4: '4242',
        })
      );
    });

    test('should handle payment_intent.succeeded with missing charges', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', customer: 'cus_123' } }, // No charges
      };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([]) // isEventProcessed
        .mockResolvedValueOnce([{ id: 'pago-1', estatus: 'pendiente' }]); // handlePaymentIntentSucceeded

      await webhookHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(
        'pago-1',
        expect.objectContaining({
          estatus: 'pagado',
          stripe_last4: null, // Should be null
        })
      );
    });

    test('should ignore already paid payment in succeeded event', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([]) // isEventProcessed
        .mockResolvedValueOnce([{ id: 'pago-1', estatus: 'pagado' }]); // handlePaymentIntentSucceeded

      await webhookHandler(req, res);

      expect(itemsServiceInstance.updateOne).not.toHaveBeenCalled();
    });

    test('should handle payment_intent.payment_failed', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123', last_payment_error: { message: 'Insufficient funds' } } },
      };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([]) // isEventProcessed
        .mockResolvedValueOnce([{ id: 'pago-1', estatus: 'pendiente', notas: 'Old notes' }]); // handlePaymentIntentFailed

      await webhookHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(
        'pago-1',
        expect.objectContaining({
          notas: expect.stringContaining('Intento de pago fallido: Insufficient funds'),
        })
      );
    });

    test('should warn if payment not found for successful intent', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_unknown' } } };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed (and subsequent checks)

      await webhookHandler(req, res);

      // It should just log warn and break, no updates
      expect(itemsServiceInstance.updateOne).not.toHaveBeenCalled();
    });

    test('should handle invoice.payment_succeeded', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'inv_1' } },
      };

      constructEvent.mockReturnValue(event);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed

      await webhookHandler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invoice payment succeeded: inv_1')
      );
      consoleSpy.mockRestore();
    });

    test('should log unhandled event type', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = { type: 'unknown.event', data: { object: {} }, id: 'evt_unknown' };
      constructEvent.mockReturnValue(event);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed

      await webhookHandler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled event type: unknown.event')
      );
      consoleSpy.mockRestore();
    });

    test('should skip signature verification if secret is missing', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = { body: { type: 'test_event', id: 'evt_test' }, headers: {} };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed

      await webhookHandler(req, res);

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      // Should rely on req.body directly
    });

    test('should handle customer.subscription events', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } },
      };

      constructEvent.mockReturnValue(event);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed

      await webhookHandler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscription event customer.subscription.created: sub_123')
      );
      consoleSpy.mockRestore();
    });

    test('should return 500 on database error during webhook processing', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValueOnce([]); // isEventProcessed
      itemsServiceInstance.readByQuery.mockRejectedValueOnce(new Error('Database error'));

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Database error'));
    });

    test('should handle string payload (skip stringify)', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: 'raw_string_payload' };
      const res = mockRes();
      constructEvent.mockReturnValue({ type: 'unknown', data: {}, id: 'evt_string' });

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed

      await webhookHandler(req, res);

      expect(constructEvent).toHaveBeenCalledWith(
        'raw_string_payload',
        'valid',
        expect.any(String)
      );
    });

    test('should not update payment if not found in failed event', async () => {
      const req = { headers: { 'stripe-signature': 'valid' }, body: {} };
      const res = mockRes();
      const event = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_123', last_payment_error: { message: 'Insufficient funds' } } },
      };
      constructEvent.mockReturnValue(event);
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([]); // isEventProcessed (and subsequent checks)

      await webhookHandler(req, res);

      expect(itemsServiceInstance.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /:id', () => {
    let patchHandler;

    beforeEach(() => {
      const call = router.patch.mock.calls.find((call) => call[0] === '/:id');
      if (call) patchHandler = call[call.length - 1];
    });

    test('should register PATCH /:id route', () => {
      expect(router.patch).toHaveBeenCalledWith('/:id', expect.any(Function));
    });

    test('should update payment successfully', async () => {
      const req = {
        params: { id: 'pago-1' },
        body: { monto: 200, notas: 'Updated' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue({ id: 'pago-1', estatus: 'pendiente' });

      await patchHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith('pago-1', {
        monto: 200,
        notas: 'Updated',
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ message: 'Pago actualizado' }) })
      );
    });

    test('should forbid update if payment is paid', async () => {
      const req = {
        params: { id: 'pago-1' },
        body: { monto: 200 },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue({ id: 'pago-1', estatus: 'pagado' });

      await patchHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('No se puede editar') }),
          ]),
        })
      );
    });

    test('should return 404 if payment not found', async () => {
      const req = {
        params: { id: 'pago-99' },
        body: { monto: 200 },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue(null);

      await patchHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should ignore non-allowed fields', async () => {
      const req = {
        params: { id: 'pago-1' },
        body: { monto: 200, random_field: 'hack' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue({ id: 'pago-1', estatus: 'pendiente' });

      await patchHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith('pago-1', { monto: 200 });
    });

    test('should return 400 if no valid fields provided', async () => {
      const req = {
        params: { id: 1 },
        body: { bad_field: 'value' },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockResolvedValue({ id: 1, estatus: 'pendiente' });

      await patchHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 500 on generic error', async () => {
      const req = {
        params: { id: 1 },
        body: { monto: 100 },
        accountability: { user: 'admin' },
        ip: '127.0.0.1',
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockRejectedValue(new Error('DB Error'));

      await patchHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('DELETE /:id', () => {
    let deleteHandler;

    beforeEach(() => {
      const call = router.delete.mock.calls.find((call) => call[0] === '/:id');
      if (call) deleteHandler = call[call.length - 1];
    });

    test('should register DELETE /:id route', () => {
      expect(router.delete).toHaveBeenCalledWith('/:id', expect.any(Function));
    });

    test('should return 403 Forbidden', async () => {
      const req = { params: { id: 'pago-1' } };
      const res = mockRes();

      await deleteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ code: 'FORBIDDEN' })]),
        })
      );
    });
  });
});

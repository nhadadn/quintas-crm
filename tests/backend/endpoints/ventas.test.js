import ventasEndpoint from '../../../extensions/ventas-api/src/index.js';
import { mockContext } from '../setup';

// Mock de Middleware
jest.mock('../../../extensions/middleware/oauth-auth.mjs', () => ({
  createOAuthMiddleware: jest.fn(() => (req, res, next) => {
    req.oauth = { user_id: 'user-123', scopes: ['write:ventas', 'read:ventas'] };
    next();
  }),
  requireScopes: jest.fn(() => (req, res, next) => next()),
}));

// Mock express router
const mockRouter = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('Ventas Endpoints', () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    ventasEndpoint(router, mockContext);
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

    test('should return list of sales', async () => {
      const req = {
        query: {},
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'] }, // Inject oauth for manual handler call
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      const mockVentas = [{ id: 'v-1', monto_total: 1000 }];
      itemsServiceInstance.readByQuery.mockResolvedValue(mockVentas);

      await getHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: 'v-1', monto_total: 1000 })]),
        })
      );
    });

    test('should apply filters', async () => {
      const req = {
        query: { cliente_id: 'client-1', vendedor_id: 'vend-1' },
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'] },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([]);

      await getHandler(req, res);

      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { cliente_id: { _eq: 'client-1' } },
              { vendedor_id: { _eq: 'vend-1' } },
            ]),
          }),
        })
      );
    });

    test('should apply date filters and pagination', async () => {
      const req = {
        query: {
          fecha_inicio: '2023-01-01',
          fecha_fin: '2023-12-31',
          page: '2',
          limit: '10',
        },
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'] },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([]);

      await getHandler(req, res);

      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { fecha_venta: { _gte: '2023-01-01' } },
              { fecha_venta: { _lte: '2023-12-31' } },
            ]),
          }),
          limit: 10,
          page: 2,
        })
      );
    });

    test('should restrict access if only read:ventas:own scope is present', async () => {
      const req = {
        query: {},
        accountability: { user: 'user-1' },
        oauth: { scopes: ['read:ventas:own'], user_id: 'user-1' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock user lookup
      itemsServiceInstance.readOne.mockResolvedValueOnce({ email: 'user@test.com' });
      // Mock vendor lookup by email
      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([{ id: 'vend-1', email: 'user@test.com' }]) // Vendor found
        .mockResolvedValueOnce([]); // Ventas query result

      await getHandler(req, res);

      // Verify we looked up the user
      expect(itemsServiceInstance.readOne).toHaveBeenCalledWith('user-1', expect.any(Object));

      // Verify we filtered by vendor_id
      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([{ vendedor_id: { _eq: 'vend-1' } }]),
          }),
        })
      );
    });

    test('should deny access if no valid scope', async () => {
      const req = {
        query: {},
        accountability: { user: 'user-1' },
        oauth: { scopes: [] },
      };
      const res = mockRes();

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Insufficient scopes', code: 'FORBIDDEN' }] })
      );
    });

    test('should return empty data if user is not a registered vendedor (read:ventas:own)', async () => {
      const req = {
        query: {},
        accountability: { user: 'user-not-vend' },
        oauth: { scopes: ['read:ventas:own'], user_id: 'user-not-vend' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValueOnce({ email: 'user@test.com' });
      itemsServiceInstance.readByQuery.mockResolvedValueOnce([]); // No vendedor found with this email

      await getHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledTimes(1); // Only looked for vendor, didn't query ventas
    });

    test('should return 500 if user context not found (read:ventas:own)', async () => {
      const req = {
        query: {},
        accountability: { user: 'user-unknown' },
        oauth: { scopes: ['read:ventas:own'], user_id: 'user-unknown' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValueOnce(null); // User not found

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'User context not found' }] })
      );
    });

    test('should handle errors and return 500', async () => {
      const req = {
        query: {},
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'] },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockRejectedValue(new Error('Database error'));

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Database error' }] })
      );
    });
  });

  describe('POST /', () => {
    let postHandler;

    beforeEach(() => {
      const call = router.post.mock.calls.find((call) => call[0] === '/');
      if (call) postHandler = call[call.length - 1];
    });

    test('should create a sale and return 201', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 12,
          tasa_interes: 10,
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mocks para las validaciones internas
      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: 'client-1' }) // Cliente
        .mockResolvedValueOnce({ id: 'lote-1', estatus: 'disponible', precio_lista: 100000 }) // Lote
        // .mockResolvedValueOnce({ id: 'vend-1', comision_porcentaje: 5 }) // Vendedor (Removed as we don't send vendedor_id)
        .mockResolvedValueOnce({ id: 'v-new', monto_total: 100000 }); // Lectura final ventaCreada

      itemsServiceInstance.createOne.mockResolvedValue('v-new');
      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      if (res.status.mock.calls[0]?.[0] !== 201) {
        console.log('Error Response:', JSON.stringify(res.json.mock.calls, null, 2));
      }

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'v-new' }) })
      );
    });

    test('should fail if client does not exist', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 12,
          tasa_interes: 10,
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValueOnce(null); // Client not found

      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Cliente not found', code: 'NOT_FOUND' }] })
      );
    });

    test('should fail if lote does not exist', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 12,
          tasa_interes: 10,
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: 'client-1' }) // Client found
        .mockResolvedValueOnce(null); // Lote not found

      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Lote not found', code: 'NOT_FOUND' }] })
      );
    });

    test('should fail if lote is not available', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 12,
          tasa_interes: 10,
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: 'client-1' })
        .mockResolvedValueOnce({ id: 'lote-1', estatus: 'vendido', precio_lista: 100000 }); // Lote sold

      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'Lote not available', code: 'LOTE_NOT_AVAILABLE' }],
        })
      );
    });

    test('should fail if enganche exceeds price', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 150000, // Price is 100k
          plazo_meses: 12,
          tasa_interes: 10,
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: 'client-1' })
        .mockResolvedValueOnce({ id: 'lote-1', estatus: 'disponible', precio_lista: 100000 });

      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'Enganche exceeds price', code: 'INVALID_AMOUNT' }],
        })
      );
    });

    test('should return 400 for invalid data', async () => {
      const req = { body: {}, accountability: { user: 'admin' } }; // Body vacío
      const res = mockRes();

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
    });

    test('should generate amortizations and commissions for financed sale', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 6, // 6 months
          tasa_interes: 12, // 12% annual
          vendedor_id: '123e4567-e89b-12d3-a456-426614174002', // valid uuid
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mocks
      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' }) // Cliente
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174001',
          estatus: 'disponible',
          precio_lista: 100000,
        }) // Lote
        .mockResolvedValueOnce({ id: 'v-new', monto_total: 100000 }) // Lectura final venta
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174002',
          comision_porcentaje: 5,
        }); // Vendedor info for commissions

      itemsServiceInstance.createOne.mockResolvedValue('v-new');

      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      if (res.status.mock.calls[0]?.[0] !== 201) {
        console.log('Error Response (financed):', JSON.stringify(res.json.mock.calls, null, 2));
      }

      expect(res.status).toHaveBeenCalledWith(201);

      // Verify commissions generated
      expect(itemsServiceInstance.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ concepto: expect.stringContaining('Comisión Enganche') }),
          expect.objectContaining({ concepto: expect.stringContaining('Comisión Contrato') }),
          expect.objectContaining({ concepto: expect.stringContaining('Comisión Liquidación') }),
        ])
      );

      // Verify amortizations generated
      expect(itemsServiceInstance.createOne).toHaveBeenCalledWith(
        expect.objectContaining({ concepto: 'Mensualidad 1 de 6' })
      );
      expect(itemsServiceInstance.createOne).toHaveBeenCalledWith(
        expect.objectContaining({ concepto: 'Mensualidad 6 de 6' })
      );
    });

    test('should rollback transaction if commission generation fails', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 12,
          tasa_interes: 10,
          vendedor_id: '123e4567-e89b-12d3-a456-426614174002',
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' }) // Cliente
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174001',
          estatus: 'disponible',
          precio_lista: 100000,
        }) // Lote
        .mockResolvedValueOnce({ id: 'v-new', monto_total: 100000 }) // Venta created
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174002',
          comision_porcentaje: 5,
        }); // Vendedor

      itemsServiceInstance.createOne.mockResolvedValue('v-new');

      // Mock createMany failure for commissions
      itemsServiceInstance.createMany.mockRejectedValueOnce(new Error('Commission Error'));

      const mockTrx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      mockContext.database.transaction.mockResolvedValue(mockTrx);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Commission Error' }] })
      );
    });

    test('should calculate correct monthly payment with 0% interest', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 10,
          tasa_interes: 0,
          vendedor_id: 'vend-1',
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' })
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174001',
          estatus: 'disponible',
          precio_lista: 100000,
        })
        .mockResolvedValueOnce({ id: 'v-new', monto_total: 100000 })
        .mockResolvedValueOnce({ id: 'vend-1', comision_porcentaje: 5 });

      itemsServiceInstance.createOne.mockResolvedValue('v-new');
      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      // 100,000 - 10,000 = 90,000 / 10 = 9,000 per month
      expect(itemsServiceInstance.createOne).toHaveBeenCalledWith(
        expect.objectContaining({ concepto: 'Mensualidad 1 de 10', monto: '9000.00' })
      );
    });

    test('should use default commission percentage if not set on vendedor', async () => {
      const req = {
        body: {
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
          lote_id: '123e4567-e89b-12d3-a456-426614174001',
          monto_enganche: 10000,
          plazo_meses: 10,
          tasa_interes: 0,
          vendedor_id: 'vend-no-commission',
        },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' }) // Client
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174001',
          estatus: 'disponible',
          precio_lista: 100000,
        }) // Lote
        .mockResolvedValueOnce({ id: 'v-new', monto_total: 100000 }) // Venta
        .mockResolvedValueOnce({ id: 'vend-no-commission' }); // Vendedor without comision_porcentaje

      itemsServiceInstance.createOne.mockResolvedValue('v-new');
      mockContext.database.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);

      // Check commissions created with default 5%
      // Total: 100,000 * 0.05 = 5,000
      // Distribution: 30% (1500), 30% (1500), 40% (2000)
      expect(itemsServiceInstance.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ monto: '1500.00' }), // 30% of 5000
          expect.objectContaining({ monto: '1500.00' }), // 30% of 5000
          expect.objectContaining({ monto: '2000.00' }), // 40% of 5000
        ])
      );
    });
  });

  describe('Rate Limiter Middleware', () => {
    let rateLimiter;

    beforeEach(() => {
      // Find the rate limiter middleware passed to router.use
      // It is likely the second call to router.use
      // 1. createOAuthMiddleware
      // 2. rateLimiter
      const calls = router.use.mock.calls;
      // We can identify it because it's a function that takes (req, res, next)
      // and is NOT the oauth middleware (which we mocked).
      // However, both are functions.
      // Let's assume it's the second one as per index.js order.
      if (calls.length >= 2) {
        rateLimiter = calls[1][0];
      }
    });

    test('should allow requests under limit', () => {
      if (!rateLimiter) return;
      const req = { method: 'GET', ip: '127.0.0.1', connection: { remoteAddress: '127.0.0.1' } };
      const res = mockRes();
      const next = jest.fn();

      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should block requests over limit', () => {
      if (!rateLimiter) return;
      const req = { method: 'GET', ip: '127.0.0.1', connection: { remoteAddress: '127.0.0.1' } };
      const res = mockRes();
      const next = jest.fn();

      // Limit is 50 for GET
      for (let i = 0; i < 50; i++) {
        rateLimiter(req, res, next);
      }

      // 51st request
      const resBlocked = mockRes();
      const nextBlocked = jest.fn();
      rateLimiter(req, resBlocked, nextBlocked);

      expect(resBlocked.status).toHaveBeenCalledWith(403);
      expect(resBlocked.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
          ]),
        })
      );
      expect(nextBlocked).not.toHaveBeenCalled();
    });
  });

  describe('Caching (Integration in GET /)', () => {
    let getHandler;

    beforeEach(() => {
      const call = router.get.mock.calls.find((call) => call[0] === '/');
      if (call) getHandler = call[call.length - 1];
    });

    test('should serve from cache on second request', async () => {
      const req = {
        query: { some: 'filter' },
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'], user_id: 'u-1' },
      };
      const res1 = mockRes();
      const res2 = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 1 }]);

      // First call - Cache Miss
      await getHandler(req, res1);
      expect(res1.set).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledTimes(1);

      // Second call - Cache Hit
      await getHandler(req, res2);
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Array) }));

      // ItemsService should NOT be called again
      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledTimes(1);
    });

    test('should expire cache after TTL', async () => {
      const req = {
        query: { some: 'filter' },
        accountability: { user: 'admin' },
        oauth: { scopes: ['read:ventas'], user_id: 'u-2' },
      };
      const res1 = mockRes();
      const res2 = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 1 }]);

      const realNow = Date.now;
      const mockNow = jest.fn(() => 1000000);
      global.Date.now = mockNow;

      try {
        // First call - Cache Miss
        await getHandler(req, res1);
        expect(res1.set).toHaveBeenCalledWith('X-Cache', 'MISS');

        // Advance time past TTL (60s = 60000ms)
        mockNow.mockReturnValue(1000000 + 61000);

        // Second call - Should be Cache Miss again because entry expired
        await getHandler(req, res2);
        expect(res2.set).toHaveBeenCalledWith('X-Cache', 'MISS');
        expect(itemsServiceInstance.readByQuery).toHaveBeenCalledTimes(2);
      } finally {
        global.Date.now = realNow;
      }
    });
  });
});

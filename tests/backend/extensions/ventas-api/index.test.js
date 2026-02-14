import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockItemsService = {
  readOne: jest.fn(),
  readByQuery: jest.fn(),
  createOne: jest.fn(),
  updateOne: jest.fn(),
  createMany: jest.fn(),
};

const mockKnex = {
  transaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

const mockDatabase = {
  transaction: jest.fn(),
};

const mockGetSchema = jest.fn();

// Mock middleware
jest.mock('../../../../extensions/middleware/oauth-auth.mjs', () => ({
  createOAuthMiddleware: () => (req, res, next) => {
    req.oauth = req.oauth || { scopes: ['read:ventas', 'write:ventas'] };
    next();
  },
  requireScopes: (scopes) => (req, res, next) => {
    // Simple mock logic for requireScopes
    const userScopes = req.oauth?.scopes || [];
    const hasScope = scopes.some((s) => userScopes.includes(s));
    if (!hasScope) return res.status(403).json({ error: 'Forbidden' });
    next();
  },
}));

// Import the extension
import ventasExtension from '../../../../extensions/ventas-api/src/index.js';

describe('Ventas API Extension', () => {
  let app;
  let mockTrx;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Mock Transaction
    mockTrx = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    mockDatabase.transaction.mockResolvedValue(mockTrx);

    // Setup ItemsService Mock Implementation
    // ItemsService is a class in the extension, so we need to mock the constructor
    // However, the extension destructures it from `services` in context

    // Setup Express App
    app = express();
    app.use(express.json());

    // Context for the extension
    const context = {
      services: {
        ItemsService: jest.fn().mockImplementation(() => mockItemsService),
      },
      getSchema: mockGetSchema,
      database: mockDatabase,
    };

    // Initialize extension
    const router = express.Router();
    ventasExtension(router, context);
    app.use('/', router);
  });

  describe('POST /', () => {
    const validVentaPayload = {
      cliente_id: '123e4567-e89b-12d3-a456-426614174000',
      lote_id: '123e4567-e89b-12d3-a456-426614174001',
      monto_enganche: 50000,
      plazo_meses: 12,
      tasa_interes: 10,
    };

    test('should create a sale successfully (happy path)', async () => {
      // Mocks for validation
      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174000',
          nombre: 'Cliente Test',
        }) // cliente
        .mockResolvedValueOnce({
          id: '123e4567-e89b-12d3-a456-426614174001',
          estatus: 'disponible',
          precio_lista: 500000,
        }) // lote
        .mockResolvedValueOnce({
          id: 'venta-new-id',
          id_venta: 'V-001',
          monto_total: 500000,
          estatus: 'contrato',
          fecha_venta: '2023-01-01',
        }); // venta creada read

      mockItemsService.createOne.mockResolvedValueOnce('venta-new-id'); // venta create

      const res = await request(app).post('/').send(validVentaPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('venta-new-id');
      expect(mockDatabase.transaction).toHaveBeenCalled();
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(mockItemsService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          estatus: 'contrato',
          monto_total: 500000,
        }),
        expect.any(Object)
      );

      // Verify lot status update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        expect.objectContaining({
          estatus: 'apartado',
          cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        })
      );
    });

    test('should fail if validation fails (Zod)', async () => {
      const res = await request(app)
        .post('/')
        .send({ ...validVentaPayload, monto_enganche: -100 });

      expect(res.status).toBe(400);
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should fail if cliente not found', async () => {
      mockItemsService.readOne.mockResolvedValueOnce(null); // Cliente not found

      const res = await request(app).post('/').send(validVentaPayload);

      expect(res.status).toBe(404);
      expect(res.body.errors[0].code).toBe('NOT_FOUND');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should fail if lote not found', async () => {
      mockItemsService.readOne
        .mockResolvedValueOnce({ id: 'cliente-uuid' }) // Cliente found
        .mockResolvedValueOnce(null); // Lote not found

      const res = await request(app).post('/').send(validVentaPayload);

      expect(res.status).toBe(404);
      expect(res.body.errors[0].message).toContain('Lote not found');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should fail if lote not available', async () => {
      mockItemsService.readOne
        .mockResolvedValueOnce({ id: 'cliente-uuid' })
        .mockResolvedValueOnce({ id: 'lote-uuid', estatus: 'vendido' }); // Lote not available

      const res = await request(app).post('/').send(validVentaPayload);

      expect(res.status).toBe(400);
      expect(res.body.errors[0].code).toBe('LOTE_NOT_AVAILABLE');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should fail if enganche exceeds price', async () => {
      mockItemsService.readOne
        .mockResolvedValueOnce({ id: 'cliente-uuid' })
        .mockResolvedValueOnce({ id: 'lote-uuid', estatus: 'disponible', precio_lista: 40000 }); // Price < Enganche (50000)

      const res = await request(app).post('/').send(validVentaPayload);

      expect(res.status).toBe(400);
      expect(res.body.errors[0].code).toBe('INVALID_AMOUNT');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    test('should generate amortizations for financed sales', async () => {
      // Mock valid flow
      mockItemsService.readOne
        .mockResolvedValueOnce({ id: 'cliente-uuid' })
        .mockResolvedValueOnce({ id: 'lote-uuid', estatus: 'disponible', precio_lista: 100000 })
        .mockResolvedValueOnce({ id: 'venta-new-id' }); // venta read

      mockItemsService.createOne.mockResolvedValueOnce('venta-new-id');

      const res = await request(app)
        .post('/')
        .send({ ...validVentaPayload, plazo_meses: 12, tasa_interes: 12, monto_enganche: 10000 });

      expect(res.status).toBe(201);
      // Verify createOne was called for payments (amortizations)
      // Since createOne is called in loop, we check call count or args
      // 1 call for venta, 12 calls for payments (loop)
      // Actually we mocked createOne globally, so we can check calls
      const paymentCalls = mockItemsService.createOne.mock.calls.filter(
        (call) => call[0].concepto && call[0].concepto.includes('Mensualidad')
      );
      expect(paymentCalls.length).toBe(12);
    });
  });

  describe('GET /', () => {
    test('should list sales successfully', async () => {
      mockItemsService.readByQuery.mockResolvedValueOnce([
        {
          id: 'v1',
          id_venta: 'V-1',
          fecha_venta: '2023-01-01',
          monto_total: 100000,
          estatus: 'contrato',
          cliente_id: { id: 'c1', nombre: 'C1', email: 'c1@test.com' },
          vendedor_id: { id: 'vd1', nombre: 'VD1' },
        },
      ]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('v1');
      expect(mockItemsService.readByQuery).toHaveBeenCalled();
    });

    test('should use cache on second request', async () => {
      const mockData = [{ id: 'v1' }];
      mockItemsService.readByQuery.mockResolvedValueOnce(mockData);

      // First request (Miss)
      const res1 = await request(app).get('/');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');

      // Second request (Hit)
      const res2 = await request(app).get('/');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');

      // Service should be called only once
      expect(mockItemsService.readByQuery).toHaveBeenCalledTimes(1);
    });

    test('should apply filters', async () => {
      mockItemsService.readByQuery.mockResolvedValueOnce([]);

      await request(app).get('/?cliente_id=c1&fecha_inicio=2023-01-01');

      expect(mockItemsService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { cliente_id: { _eq: 'c1' } },
              { fecha_venta: { _gte: '2023-01-01' } },
            ]),
          }),
        })
      );
    });
  });
});

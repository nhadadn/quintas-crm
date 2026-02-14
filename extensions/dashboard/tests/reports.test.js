import { describe, it, expect, vi, beforeEach } from 'vitest';
import registerEndpoint from '../src/index.js';
import * as utils from '../src/utils.js';

// Mock utils
vi.mock('../src/utils.js', () => ({
  exportToPDF: vi.fn(),
  exportToExcel: vi.fn(),
  formatCurrency: vi.fn((val) => `$${val}`),
}));

describe('Dashboard Reports Endpoint', () => {
  let mockRouter;
  let mockServices;
  let mockDatabase;
  let mockSchema;
  let mockAccountability;
  let req;
  let res;
  let handlers = {};

  beforeEach(() => {
    mockRouter = {
      get: vi.fn((path, handler) => {
        handlers[path] = handler;
      }),
      post: vi.fn(),
      use: vi.fn(),
    };

    mockSchema = {};
    mockAccountability = { admin: true };

    // Mock Database (Knex)
    const mockDbInstance = vi.fn().mockReturnThis();
    mockDbInstance.select = vi.fn().mockReturnThis();
    mockDbInstance.raw = vi.fn((val) => val);
    mockDbInstance.groupByRaw = vi.fn().mockReturnThis();
    mockDbInstance.orderBy = vi.fn().mockReturnThis();
    mockDbInstance.limit = vi.fn().mockReturnThis();
    mockDbInstance.columnInfo = vi.fn().mockResolvedValue({});

    mockDatabase = vi.fn(() => mockDbInstance);
    mockDatabase.select = mockDbInstance.select;
    mockDatabase.raw = mockDbInstance.raw;
    mockDatabase.groupByRaw = mockDbInstance.groupByRaw;
    mockDatabase.orderBy = mockDbInstance.orderBy;
    mockDatabase.limit = mockDbInstance.limit;

    // Mock ItemsService
    const mockItemsServiceInstance = {
      readByQuery: vi.fn(),
      readOne: vi.fn(),
    };

    mockServices = {
      ItemsService: vi.fn(function () {
        return mockItemsServiceInstance;
      }),
      UsersService: vi.fn(function () {
        return {};
      }),
    };

    req = {
      schema: mockSchema,
      accountability: mockAccountability,
      query: {},
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };

    // Register endpoints
    registerEndpoint(mockRouter, {
      services: mockServices,
      database: mockDatabase,
      getSchema: vi.fn(),
    });
  });

  describe('GET /kpis', () => {
    it('should return calculated KPIs', async () => {
      const handler = handlers['/kpis'];
      const mockItemsService = new mockServices.ItemsService();

      // Mock aggregations for Ventas, Pagos, Clientes
      mockItemsService.readByQuery
        .mockResolvedValueOnce([{ sum: { monto_total: 1000 }, count: 10 }]) // ventas
        .mockResolvedValueOnce([{ sum: { monto: 800 } }]) // pagos
        .mockResolvedValueOnce([{ count: 5 }]); // clientes

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: {
          total_ventas: 1000,
          total_cobrado: 800,
          por_cobrar: 200,
          clientes_activos: 5,
          ventas_count: 10,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const handler = handlers['/kpis'];
      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readByQuery.mockRejectedValue(new Error('DB Error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('GET /ventas-por-mes', () => {
    it('should return sales grouped by month', async () => {
      const handler = handlers['/ventas-por-mes'];
      const mockResult = [
        { mes: '2023-01', total: 100 },
        { mes: '2023-02', total: 200 },
      ];

      // Expected result is reversed (chronological order)
      const expected = [...mockResult].reverse();

      // Mock Knex execution - return a copy to avoid mutation side-effects
      mockDatabase.limit.mockResolvedValue([...mockResult]);

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: expected,
      });
    });
  });

  describe('GET /ventas-por-vendedor', () => {
    it('should return sales by seller enriched with names', async () => {
      const handler = handlers['/ventas-por-vendedor'];
      const mockItemsService = new mockServices.ItemsService();

      // Mock aggregations
      mockItemsService.readByQuery.mockResolvedValue([
        { vendedor_id: 1, sum: { monto_total: 500 }, count: 2 },
        { vendedor_id: 2, sum: { monto_total: 300 }, count: 1 },
      ]);

      // Mock seller details
      mockItemsService.readOne
        .mockResolvedValueOnce({ nombre: 'Juan', apellido_paterno: 'Perez' })
        .mockResolvedValueOnce({ nombre: 'Maria', apellido_paterno: 'Lopez' });

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { vendedor: 'Juan Perez', total: 500, cantidad: 2 },
          { vendedor: 'Maria Lopez', total: 300, cantidad: 1 },
        ]),
      });
    });

    it('should export to PDF when requested', async () => {
      const handler = handlers['/ventas-por-vendedor'];
      req.query.formato = 'pdf';
      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readByQuery.mockResolvedValue([]);

      await handler(req, res);

      expect(utils.exportToPDF).toHaveBeenCalled();
      expect(utils.exportToPDF).toHaveBeenCalledWith(
        res,
        expect.any(Array),
        'Reporte de Ventas por Vendedor',
        expect.any(Array)
      );
    });

    it('should export to Excel when requested', async () => {
      const handler = handlers['/ventas-por-vendedor'];
      req.query.formato = 'excel';
      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readByQuery.mockResolvedValue([]);

      await handler(req, res);

      expect(utils.exportToExcel).toHaveBeenCalled();
      expect(utils.exportToExcel).toHaveBeenCalledWith(
        res,
        expect.any(Array),
        'Reporte de Ventas por Vendedor',
        expect.any(Array)
      );
    });
  });
});

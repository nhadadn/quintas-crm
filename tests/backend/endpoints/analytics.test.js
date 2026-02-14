const analyticsExtension = require('../../../extensions/dashboard/src/index.js').default;
const { mockContext, mockRes } = require('../setup');

describe('Analytics Custom Endpoints', () => {
  let router;
  let req;
  let res;
  let context;

  // Handler references
  let resumenHandler;
  let pagosPorEstatusHandler;
  let lotesPorEstatusHandler;
  let ventasPorMesHandler;
  let ventasPorVendedorHandler;
  let debugPermissionsHandler;
  let loggingMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();

    router = {
      get: jest.fn((path, handler) => {
        if (path === '/kpis') resumenHandler = handler;
        if (path === '/pagos-por-estatus') pagosPorEstatusHandler = handler;
        if (path === '/lotes-por-estatus') lotesPorEstatusHandler = handler;
        if (path === '/ventas-por-mes') ventasPorMesHandler = handler;
        if (path === '/ventas-por-vendedor') ventasPorVendedorHandler = handler;
        if (path === '/debug/permissions') debugPermissionsHandler = handler;
      }),
      use: jest.fn((handler) => {
        loggingMiddleware = handler;
      }),
    };

    context = mockContext; // Uses global mockContext from setup.js

    // Initialize extension
    analyticsExtension(router, context);

    req = {
      schema: {},
      accountability: { user: 'admin', role: 'admin' },
      method: 'GET',
      path: '/test',
      query: {},
    };
    res = mockRes();
  });

  describe('Middleware', () => {
    test('should log request', () => {
      const next = jest.fn();
      const consoleSpy = jest.spyOn(console, 'log');

      loggingMiddleware(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('[CRM-ANALYTICS] Request:', 'GET', '/test');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('GET /debug/permissions', () => {
    test('should return roles and permissions', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([{ id: 1, name: 'Admin' }]) // roles
        .mockResolvedValueOnce([{ id: 1, collection: 'lotes' }]); // permissions

      await debugPermissionsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        roles: [{ id: 1, name: 'Admin' }],
        permissions: [{ id: 1, collection: 'lotes' }],
      });
    });

    test('should handle error in debug permissions', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockRejectedValueOnce(new Error('DB Error'));

      await debugPermissionsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('GET /resumen', () => {
    test('should return summary data', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery
        .mockResolvedValueOnce([{ sum: { monto_total: 10000 }, count: 5 }])
        .mockResolvedValueOnce([{ sum: { monto: 5000 } }])
        .mockResolvedValueOnce([{ count: 20 }]);

      await resumenHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: {
          total_ventas: 10000,
          total_cobrado: 5000,
          por_cobrar: 5000,
          clientes_activos: 20,
          ventas_count: 5,
        },
      });
    });

    test('should handle 500 error in /resumen', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValueOnce(new Error('DB Error'));

      await resumenHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('GET /pagos-por-estatus', () => {
    test('should return pagos grouped by status', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValueOnce([
        { estatus: 'pagado', sum: { monto: 5000 }, count: 10 },
        { estatus: 'pendiente', sum: { monto: 2000 }, count: 5 },
      ]);

      await pagosPorEstatusHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          { estatus: 'pagado', total: 5000, cantidad: 10 },
          { estatus: 'pendiente', total: 2000, cantidad: 5 },
        ],
      });
    });

    test('should handle error in /pagos-por-estatus', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValueOnce(new Error('DB Error'));

      await pagosPorEstatusHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /lotes-por-estatus', () => {
    test('should return lotes grouped by status', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValueOnce([
        { estatus: 'disponible', sum: { precio_lista: 100000 }, count: 2 },
        { estatus: 'vendido', sum: { precio_lista: 50000 }, count: 1 },
      ]);

      await lotesPorEstatusHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          { estatus: 'disponible', total: 100000, cantidad: 2 },
          { estatus: 'vendido', total: 50000, cantidad: 1 },
        ],
      });
    });

    test('should handle error in /lotes-por-estatus', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValueOnce(new Error('DB Error'));

      await lotesPorEstatusHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /ventas-por-mes', () => {
    test('should return ventas grouped by month', async () => {
      const { database } = context;

      database.mockImplementation((table) => {
        if (table === 'ventas') {
          return {
            select: jest.fn().mockReturnThis(),
            groupByRaw: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([
              { mes: '2023-02', total: 5000 },
              { mes: '2023-01', total: 3000 },
            ]), // Knex returns promise on last call
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      await ventasPorMesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          { mes: '2023-01', total: 3000 },
          { mes: '2023-02', total: 5000 },
        ],
      });
    });

    test('should handle error in /ventas-por-mes', async () => {
      const { database } = context;
      database.mockImplementation(() => {
        throw new Error('DB Error');
      });

      await ventasPorMesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /ventas-por-vendedor', () => {
    test('should return ventas grouped by seller', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      // Mock aggregated result
      itemsServiceInstance.readByQuery.mockResolvedValueOnce([
        { vendedor_id: 1, sum: { monto_total: 3000 }, count: 2 },
        { vendedor_id: 2, sum: { monto_total: 5000 }, count: 1 },
      ]);

      // Mock seller details
      itemsServiceInstance.readOne
        .mockResolvedValueOnce({ nombre: 'Juan', apellido_paterno: 'Perez' })
        .mockResolvedValueOnce({ nombre: 'Maria', apellido_paterno: 'Lopez' });

      await ventasPorVendedorHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { vendedor: 'Maria Lopez', total: 5000, cantidad: 1 },
          { vendedor: 'Juan Perez', total: 3000, cantidad: 2 },
        ]),
      });
    });

    test('should handle ventas without seller', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValueOnce([
        { vendedor_id: null, sum: { monto_total: 1000 }, count: 1 },
      ]);

      await ventasPorVendedorHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [{ vendedor: 'Desconocido', total: 1000, cantidad: 1 }],
      });
    });

    test('should handle error in /ventas-por-vendedor', async () => {
      const { ItemsService } = context.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));

      await ventasPorVendedorHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

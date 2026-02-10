
const analyticsExtension = require('../../../extensions/analytics-custom/src/index.js').default;
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
        if (path === '/resumen') resumenHandler = handler;
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
        path: '/test'
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
              permissions: [{ id: 1, collection: 'lotes' }]
          });
      });

      test('should handle error in debug permissions', async () => {
          const { ItemsService } = context.services;
          const itemsServiceInstance = new ItemsService();
          
          itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));
          
          await debugPermissionsHandler(req, res);
          
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
      });
  });

  describe('GET /resumen', () => {
    test('should return summary data', async () => {
      const { database } = context;
      
      let callCount = 0;
      database.mockImplementation((table) => {
        callCount++;
        const chain = {
            where: jest.fn().mockReturnThis(),
            sum: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            first: jest.fn(),
            columnInfo: jest.fn().mockResolvedValue({}), // For startup check
        };
        
        if (table === 'ventas') {
            chain.first.mockResolvedValue({ total: 10000, count: 5 });
        } else if (table === 'pagos') {
            chain.first.mockResolvedValue({ total: 5000 });
        } else if (table === 'lotes') {
            chain.first.mockResolvedValue({ count: 10 });
        } else if (table === 'clientes') {
            chain.first.mockResolvedValue({ count: 20 });
        }
        
        return chain;
      });

      await resumenHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total_ventas: 10000,
        cantidad_ventas: 5,
        total_pagos: 5000,
        lotes_disponibles: 10,
        clientes_activos: 20
      });
    });

    test('should handle 503 error in /resumen', async () => {
        const { database } = context;
        database.mockImplementation(() => { throw new Error('DB Error'); });

        await resumenHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('GET /pagos-por-estatus', () => {
    test('should return pagos grouped by status', async () => {
        const { database } = context;
        
        database.mockImplementation(() => {
            return {
                select: jest.fn().mockReturnThis(),
                sum: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                columnInfo: jest.fn().mockResolvedValue({}),
                then: (resolve) => resolve([
                    { estatus: 'pagado', total: 5000, cantidad: 10 },
                    { estatus: 'pendiente', total: 2000, cantidad: 5 }
                ])
            };
        });

        await pagosPorEstatusHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [
                { estatus: 'pagado', total: 5000, cantidad: 10 },
                { estatus: 'pendiente', total: 2000, cantidad: 5 }
            ]
        });
    });

    test('should handle 503 error in /pagos-por-estatus', async () => {
        const { database } = context;
        database.mockImplementation(() => { throw new Error('DB Error'); });
        
        await pagosPorEstatusHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('GET /lotes-por-estatus', () => {
    test('should return lotes grouped by status', async () => {
        const { database } = context;
        
        database.mockImplementation(() => {
            return {
                select: jest.fn().mockReturnThis(),
                sum: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                columnInfo: jest.fn().mockResolvedValue({}),
                then: (resolve) => resolve([
                    { estatus: 'disponible', total: 100000, cantidad: 2 },
                    { estatus: 'vendido', total: 50000, cantidad: 1 }
                ])
            };
        });

        await lotesPorEstatusHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [
                { estatus: 'disponible', total: 100000, cantidad: 2 },
                { estatus: 'vendido', total: 50000, cantidad: 1 }
            ]
        });
    });

    test('should handle 503 error in /lotes-por-estatus', async () => {
        const { database } = context;
        database.mockImplementation(() => { throw new Error('DB Error'); });
        
        await lotesPorEstatusHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('GET /ventas-por-mes', () => {
    test('should return ventas grouped by month', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        
        itemsServiceInstance.readByQuery.mockResolvedValue([
            { fecha_venta: '2023-01-15', monto_total: 1000 },
            { fecha_venta: '2023-01-20', monto_total: 2000 },
            { fecha_venta: '2023-02-10', monto_total: 5000 }
        ]);

        await ventasPorMesHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [
                { mes: '2023-01', total: 3000, cantidad: 2 },
                { mes: '2023-02', total: 5000, cantidad: 1 }
            ]
        });
    });

    test('should handle empty date in ventas', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        
        itemsServiceInstance.readByQuery.mockResolvedValue([
            { fecha_venta: null, monto_total: 1000 } // Should be ignored
        ]);

        await ventasPorMesHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    test('should handle error in /ventas-por-mes', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));
        
        await ventasPorMesHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('GET /ventas-por-vendedor', () => {
    test('should return ventas grouped by seller', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        
        itemsServiceInstance.readByQuery.mockResolvedValue([
            { monto_total: 1000, vendedor_id: { nombre: 'Juan', apellido_paterno: 'Perez' } },
            { monto_total: 2000, vendedor_id: { nombre: 'Juan', apellido_paterno: 'Perez' } },
            { monto_total: 5000, vendedor_id: { nombre: 'Maria', apellido_paterno: 'Lopez' } }
        ]);

        await ventasPorVendedorHandler(req, res);

        // Result order is not guaranteed by Object.values unless specific JS engine, but test data implies order
        // The implementation does Object.values(agrupado)
        
        expect(res.json).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                { vendedor: 'Juan Perez', total: 3000, cantidad: 2 },
                { vendedor: 'Maria Lopez', total: 5000, cantidad: 1 }
            ])
        });
    });

    test('should handle ventas without seller', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        
        itemsServiceInstance.readByQuery.mockResolvedValue([
            { monto_total: 1000, vendedor_id: null }
        ]);

        await ventasPorVendedorHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: [{ vendedor: 'Sin Asignar', total: 1000, cantidad: 1 }]
        });
    });

    test('should handle error in /ventas-por-vendedor', async () => {
        const { ItemsService } = context.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));
        
        await ventasPorVendedorHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});

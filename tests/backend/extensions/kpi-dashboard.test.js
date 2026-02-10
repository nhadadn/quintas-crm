
import crmAnalyticsEndpoint from '../../../extensions/analytics-custom/src/index.js';
import { mockContext } from '../setup';

// Mock express router
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  use: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('KPI Dashboard (CRM Analytics) Extension', () => {
  let router;
  let ventasPorMesHandler;
  let ventasPorVendedorHandler;
  let resumenHandler;
  let pagosPorEstatusHandler;
  let lotesPorEstatusHandler;
  let debugPermissionsHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    crmAnalyticsEndpoint(router, mockContext);
    
    // Extract handlers
    const ventasMesCall = router.get.mock.calls.find(call => call[0] === '/ventas-por-mes');
    if (ventasMesCall) ventasPorMesHandler = ventasMesCall[ventasMesCall.length - 1];

    const ventasVendedorCall = router.get.mock.calls.find(call => call[0] === '/ventas-por-vendedor');
    if (ventasVendedorCall) ventasPorVendedorHandler = ventasVendedorCall[ventasVendedorCall.length - 1];

    const resumenCall = router.get.mock.calls.find(call => call[0] === '/resumen');
    if (resumenCall) resumenHandler = resumenCall[resumenCall.length - 1];

    const pagosEstatusCall = router.get.mock.calls.find(call => call[0] === '/pagos-por-estatus');
    if (pagosEstatusCall) pagosPorEstatusHandler = pagosEstatusCall[pagosEstatusCall.length - 1];

    const lotesEstatusCall = router.get.mock.calls.find(call => call[0] === '/lotes-por-estatus');
    if (lotesEstatusCall) lotesPorEstatusHandler = lotesEstatusCall[lotesEstatusCall.length - 1];

    const debugPermsCall = router.get.mock.calls.find(call => call[0] === '/debug/permissions');
    if (debugPermsCall) debugPermissionsHandler = debugPermsCall[debugPermsCall.length - 1];
  });

  describe('GET /resumen', () => {
    test('should return summary metrics', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();

      mockContext.database.mockImplementation((table) => {
        return {
          where: jest.fn().mockReturnThis(),
          sum: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          first: jest.fn().mockImplementation(() => {
            if (table === 'ventas') return Promise.resolve({ total: 50000, count: 5 });
            if (table === 'pagos') return Promise.resolve({ total: 20000 });
            if (table === 'lotes') return Promise.resolve({ count: 10 });
            if (table === 'clientes') return Promise.resolve({ count: 8 });
            return Promise.resolve(null);
          })
        };
      });

      await resumenHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total_ventas: 50000,
        cantidad_ventas: 5,
        total_pagos: 20000,
        lotes_disponibles: 10,
        clientes_activos: 8
      });
    });

    test('should handle database errors', async () => {
        const req = { schema: {}, accountability: { user: 'admin' } };
        const res = mockRes();
  
        mockContext.database.mockImplementation(() => {
            throw new Error('DB Error');
        });
  
        await resumenHandler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'DB Error' }));
      });
  });

  describe('GET /pagos-por-estatus', () => {
    test('should return payments grouped by status', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      
      mockContext.database.mockImplementation((table) => {
        return {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          sum: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          columnInfo: jest.fn().mockResolvedValue({}),
          then: (resolve) => {
             return Promise.resolve([
               { estatus: 'pagado', total: 3000, cantidad: 2 },
               { estatus: 'pendiente', total: 1500, cantidad: 1 }
             ]).then(resolve);
          }
        };
      });

      await pagosPorEstatusHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          { estatus: 'pagado', total: 3000, cantidad: 2 },
          { estatus: 'pendiente', total: 1500, cantidad: 1 },
        ]
      });
    });
  });

  describe('GET /lotes-por-estatus', () => {
    test('should return lots grouped by status', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      
      mockContext.database.mockImplementation((table) => {
        return {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          sum: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          columnInfo: jest.fn().mockResolvedValue({}),
          then: (resolve) => {
             return Promise.resolve([
               { estatus: 'vendido', total: 200000, cantidad: 2 },
               { estatus: 'disponible', total: 120000, cantidad: 1 }
             ]).then(resolve);
          }
        };
      });

      await lotesPorEstatusHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          { estatus: 'vendido', total: 200000, cantidad: 2 },
          { estatus: 'disponible', total: 120000, cantidad: 1 },
        ]
      });
    });
  });

  describe('GET /debug/permissions', () => {
      test('should return roles and permissions', async () => {
          const req = { schema: {}, accountability: { user: 'admin' } };
          const res = mockRes();
          
          const { ItemsService } = mockContext.services;
          const itemsServiceInstance = new ItemsService();
          
          itemsServiceInstance.readByQuery
            .mockResolvedValueOnce([{ id: 'role-1', name: 'Admin' }]) // Roles
            .mockResolvedValueOnce([{ id: 1, collection: 'ventas' }]); // Permissions

          await debugPermissionsHandler(req, res);

          expect(res.json).toHaveBeenCalledWith({
              roles: [{ id: 'role-1', name: 'Admin' }],
              permissions: [{ id: 1, collection: 'ventas' }]
          });
      });
  });

  describe('GET /ventas-por-mes (Sales by Period)', () => {
    test('should return sales grouped by month', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      itemsServiceInstance.readByQuery.mockResolvedValue([
        { fecha_venta: '2024-01-15', monto_total: 1000 },
        { fecha_venta: '2024-01-20', monto_total: 2000 },
        { fecha_venta: '2024-02-10', monto_total: 1500 },
      ]);

      await ventasPorMesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.arrayContaining([
          { mes: '2024-01', total: 3000, cantidad: 2 },
          { mes: '2024-02', total: 1500, cantidad: 1 },
        ])
      }));
    });

    test('should handle empty data', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      new ItemsService().readByQuery.mockResolvedValue([]);

      await ventasPorMesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe('GET /ventas-por-vendedor (Sales by Seller)', () => {
    test('should return ranking of sellers', async () => {
      const req = { schema: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      itemsServiceInstance.readByQuery.mockResolvedValue([
        { monto_total: 5000, vendedor_id: { nombre: 'Juan', apellido_paterno: 'Perez' } },
        { monto_total: 3000, vendedor_id: { nombre: 'Juan', apellido_paterno: 'Perez' } },
        { monto_total: 4000, vendedor_id: { nombre: 'Maria', apellido_paterno: 'Lopez' } },
      ]);

      await ventasPorVendedorHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.arrayContaining([
          { vendedor: 'Juan Perez', total: 8000, cantidad: 2 },
          { vendedor: 'Maria Lopez', total: 4000, cantidad: 1 },
        ])
      }));
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import registerEndpoint from '../src/index.js';

describe('Commissions Endpoint', () => {
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
      put: vi.fn((path, handler) => {
        handlers[path] = handler;
      }),
      post: vi.fn(),
      use: vi.fn(),
    };

    mockSchema = {};
    mockAccountability = { admin: true, user: 'user-123' };

    // Mock Database (Knex)
    const mockDbInstance = vi.fn().mockReturnThis();
    mockDbInstance.where = vi.fn().mockReturnThis();
    mockDbInstance.select = vi.fn().mockReturnThis();
    mockDbInstance.sum = vi.fn().mockReturnThis();
    mockDbInstance.count = vi.fn().mockReturnThis();
    mockDbInstance.groupBy = vi.fn().mockReturnThis();

    mockDatabase = vi.fn(() => mockDbInstance);
    mockDatabase.where = mockDbInstance.where;
    mockDatabase.select = mockDbInstance.select;
    mockDatabase.sum = mockDbInstance.sum;
    mockDatabase.count = mockDbInstance.count;
    mockDatabase.groupBy = mockDbInstance.groupBy;

    // Mock ItemsService & UsersService
    const mockItemsServiceInstance = {
      readByQuery: vi.fn(),
      readOne: vi.fn(),
      updateOne: vi.fn(),
    };
    const mockUsersServiceInstance = {
      readOne: vi.fn(),
    };

    mockServices = {
      ItemsService: vi.fn(function () {
        return mockItemsServiceInstance;
      }),
      UsersService: vi.fn(function () {
        return mockUsersServiceInstance;
      }),
    };

    req = {
      schema: mockSchema,
      accountability: mockAccountability,
      query: {},
      params: {},
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
      getSchema: vi.fn().mockResolvedValue(mockSchema),
    });
  });

  describe('GET /calcular', () => {
    it('should calculate commission correctly', async () => {
      const handler = handlers['/calcular'];
      req.query.venta_id = '123';

      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: '123',
          monto_total: 100000,
          vendedor_id: '456',
          fecha_venta: '2023-01-01',
        }) // Venta
        .mockResolvedValueOnce({
          id: '456',
          nombre: 'Juan',
          apellido_paterno: 'Perez',
          comision_porcentaje: 5,
        }); // Vendedor

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            venta_id: '123',
            comision_total: 5000, // 5% of 100,000
            vendedor_id: '456',
            esquema: 'porcentaje_hitos',
            detalles: expect.objectContaining({
              monto_venta: 100000,
              porcentaje_aplicado: 5,
            }),
          }),
        })
      );
    });

    it('should return 400 if venta_id is missing', async () => {
      const handler = handlers['/calcular'];
      req.query.venta_id = undefined;

      // Mock res.status to return res (chainable)
      res.status = vi.fn().mockReturnValue(res);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: 'Falta parámetro requerido: venta_id' })
          ])
        })
      );
    });

    it('should return 404 if venta not found', async () => {
        const handler = handlers['/calcular'];
        req.query.venta_id = '999';
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValueOnce(null); // Venta null

        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ message: 'Venta 999 no encontrada' })
            ])
          })
        );
    });

    it('should return 400 if venta has no vendedor_id', async () => {
        const handler = handlers['/calcular'];
        req.query.venta_id = '123';
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValueOnce({
            id: '123',
            monto_total: 100000,
            vendedor_id: null,
        }); 

        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ message: 'La venta 123 no tiene vendedor asignado' })
            ])
          })
        );
    });

    it('should return 404 if vendedor not found', async () => {
        const handler = handlers['/calcular'];
        req.query.venta_id = '123';
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne
          .mockResolvedValueOnce({
            id: '123',
            monto_total: 100000,
            vendedor_id: '456',
          }) // Venta found
          .mockResolvedValueOnce(null); // Vendedor null

        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ message: 'Vendedor 456 no encontrado' })
            ])
          })
        );
    });
  });

  describe('GET /mis-comisiones', () => {
    it('should return commissions for the logged-in seller', async () => {
      const handler = handlers['/mis-comisiones'];
      req.accountability = { user: 'user-123', admin: false };

      const mockUsersService = new mockServices.UsersService();
      mockUsersService.readOne.mockResolvedValue({ email: 'vendedor@test.com' });

      const mockItemsService = new mockServices.ItemsService();
      // Mock vendedores search by email
      mockItemsService.readByQuery
        .mockResolvedValueOnce([{ id: 'seller-456' }]) // Find vendedor by email
        .mockResolvedValueOnce([{ id: 'comm-1', amount: 100 }]); // Get commissions

      await handler(req, res);

      // Verify getVendedorIdFromUser logic
      expect(mockServices.UsersService).toHaveBeenCalled();

      // Verify commissions query
      expect(mockItemsService.readByQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: { vendedor_id: { _eq: 'seller-456' } },
        })
      );

      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'comm-1', amount: 100 }] });
    });

    it('should forbid access if user is not a seller', async () => {
      const handler = handlers['/mis-comisiones'];
      req.accountability = { user: 'user-123', admin: false };

      const mockUsersService = new mockServices.UsersService();
      mockUsersService.readOne.mockResolvedValue({ email: 'user@test.com' });

      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readByQuery.mockResolvedValueOnce([]); // No seller found

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('No se encontró un perfil'),
            }),
          ]),
        })
      );
    });
  });

  describe('GET /mis-comisiones/resumen', () => {
    it('should return summary stats for seller', async () => {
      const handler = handlers['/mis-comisiones/resumen'];
      req.accountability = { user: 'user-123', admin: false };

      // Mock seller lookup
      const mockUsersService = new mockServices.UsersService();
      mockUsersService.readOne.mockResolvedValue({ email: 'vendedor@test.com' });
      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readByQuery.mockResolvedValueOnce([{ id: 'seller-456' }]);

      // Mock DB aggregation
      mockDatabase.groupBy.mockResolvedValue([
        { estatus: 'pendiente', total: 5000, cantidad: 2 },
        { estatus: 'pagada', total: 2000, cantidad: 1 },
      ]);

      await handler(req, res);

      expect(mockDatabase).toHaveBeenCalledWith('comisiones');
      expect(mockDatabase.where).toHaveBeenCalledWith('vendedor_id', 'seller-456');

      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pendiente: { total: 5000, cantidad: 2 },
          pagada: { total: 2000, cantidad: 1 },
          total_acumulado: 7000,
        }),
      });
    });

    it('should forbid access if user is not a seller (resumen)', async () => {
        const handler = handlers['/mis-comisiones/resumen'];
        req.accountability = { user: 'user-123', admin: false };
  
        const mockUsersService = new mockServices.UsersService();
        mockUsersService.readOne.mockResolvedValue({ email: 'user@test.com' });
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readByQuery.mockResolvedValueOnce([]); // No seller found
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                message: expect.stringContaining('No se encontró un perfil'),
              }),
            ]),
          })
        );
    });

    it('should handle database errors gracefully', async () => {
        const handler = handlers['/mis-comisiones/resumen'];
        req.accountability = { user: 'user-123', admin: false };
  
        const mockUsersService = new mockServices.UsersService();
        mockUsersService.readOne.mockResolvedValue({ email: 'vendedor@test.com' });
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readByQuery.mockResolvedValueOnce([{ id: 'seller-456' }]);
  
        // Mock DB Error
        mockDatabase.groupBy.mockRejectedValue(new Error('DB Error'));
        
        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ message: 'DB Error' }),
            ]),
          })
        );
    });
  });

  describe('PUT /:id/aprobar', () => {
    it('should allow admin to approve commission', async () => {
      const handler = handlers['/:id/aprobar'];
      req.params.id = 'comm-1';
      req.accountability = { admin: true, user: 'admin-1' };

      const mockItemsService = new mockServices.ItemsService();
      mockItemsService.readOne.mockResolvedValue({ estatus: 'pendiente' });

      await handler(req, res);

      expect(mockItemsService.updateOne).toHaveBeenCalledWith('comm-1', {
        estatus: 'aprobada',
        fecha_aprobacion: expect.any(Date),
        aprobado_por: 'admin-1',
      });

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should forbid non-admin', async () => {
      const handler = handlers['/:id/aprobar'];
      req.accountability = { admin: false };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if commission not found', async () => {
        const handler = handlers['/:id/aprobar'];
        req.params.id = 'comm-999';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue(null);
  
        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
        
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ message: 'Comisión no encontrada' })]) })
        );
    });

    it('should throw error if commission is cancelled', async () => {
        const handler = handlers['/:id/aprobar'];
        req.params.id = 'comm-1';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue({ id: 'comm-1', estatus: 'cancelada' });
  
        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);

        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400); // InvalidPayloadException usually maps to 400
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ message: 'No se puede aprobar una comisión cancelada.' })]) })
        );
    });
  });

  describe('PUT /:id/pagar', () => {
    it('should allow admin to pay commission', async () => {
        const handler = handlers['/:id/pagar'];
        req.params.id = 'comm-1';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue({ id: 'comm-1', estatus: 'aprobada' });
  
        await handler(req, res);
  
        expect(mockItemsService.updateOne).toHaveBeenCalledWith('comm-1', {
          estatus: 'pagada',
          fecha_pago: expect.any(Date),
        });
  
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Comisión pagada' }));
    });

    it('should forbid non-admin', async () => {
        const handler = handlers['/:id/pagar'];
        req.accountability = { admin: false };
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if commission is not approved', async () => {
        const handler = handlers['/:id/pagar'];
        req.params.id = 'comm-1';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue({ id: 'comm-1', estatus: 'pendiente' });
        
        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ message: 'La comisión debe estar aprobada para poder pagarse.' })]) })
        );
    });
  });

  describe('PUT /:id/cancelar', () => {
    it('should allow admin to cancel commission', async () => {
        const handler = handlers['/:id/cancelar'];
        req.params.id = 'comm-1';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue({ id: 'comm-1', estatus: 'pendiente' });
  
        await handler(req, res);
  
        expect(mockItemsService.updateOne).toHaveBeenCalledWith('comm-1', {
          estatus: 'cancelada',
        });
  
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Comisión cancelada' }));
    });

    it('should forbid non-admin', async () => {
        const handler = handlers['/:id/cancelar'];
        req.accountability = { admin: false };
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if commission is already paid', async () => {
        const handler = handlers['/:id/cancelar'];
        req.params.id = 'comm-1';
        req.accountability = { admin: true, user: 'admin-1' };
  
        const mockItemsService = new mockServices.ItemsService();
        mockItemsService.readOne.mockResolvedValue({ id: 'comm-1', estatus: 'pagada' });
        
        // Mock res.status to return res (chainable)
        res.status = vi.fn().mockReturnValue(res);
  
        await handler(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ message: 'No se puede cancelar una comisión ya pagada.' })]) })
        );
    });
  });
});

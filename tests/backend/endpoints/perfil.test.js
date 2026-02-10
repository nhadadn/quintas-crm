import perfilEndpoint from '../../../extensions/perfil/src/index.js';
import { mockContext } from '../setup';

// Mock express router
const mockRouter = {
  get: jest.fn(),
  use: jest.fn(), // If used
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Knex
const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve([])),
    reduce: jest.fn((cb, init) => [].reduce(cb, init)),
    length: 0
};
// Make mockKnex a callable function that returns the builder
const mockKnex = jest.fn(() => mockQueryBuilder);

// Helper to set mock data for Knex
const setKnexResponse = (data) => {
    mockQueryBuilder.then = jest.fn((resolve) => resolve(data));
    mockQueryBuilder.length = data.length;
    // Mock array methods if needed (reduce is called on the result array, not the builder, usually. 
    // Wait, await knex() returns the array. So the result of await is what matters.
};

describe('Perfil Endpoint', () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    // Reset Knex
    mockContext.database = mockKnex;
    // Initialize endpoint
    perfilEndpoint(router, mockContext);
  });

  test('should register GET / route', () => {
    expect(router.get).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('should register GET /ping route', () => {
    expect(router.get).toHaveBeenCalledWith('/ping', expect.any(Function));
  });

  describe('GET /', () => {
    let getHandler;

    beforeEach(() => {
      getHandler = router.get.mock.calls.find(call => call[0] === '/')[1];
    });

    test('should return 401 if not authenticated', async () => {
        const req = { accountability: null };
        const res = mockRes();
        
        await getHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 400 if user is not a client and no cliente_id provided', async () => {
        const req = { accountability: { user: 'user-id', role: 'admin' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const adminService = new ItemsService();
        // Mock finding associated client -> None found
        adminService.readByQuery.mockResolvedValue([]);

        await getHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('cliente_id es requerido') }));
    });

    test('should fetch profile for associated client', async () => {
        const req = { accountability: { user: 'user-id' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        
        // 1. Mock finding associated client
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([{ id: 1 }]) // Found client 1
        }));

        // 2. Mock debug ventas check
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([{ id: 10 }])
        }));

        // 3. Mock reading client details
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockResolvedValue({ id: 1, nombre: 'Juan' })
        }));

        // 4. Mock reading ventas (Admin context)
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([
                { id: 10, monto_total: 1000, pagos: [{ monto: 500 }] }
            ])
        }));

        // 4. Mock Knex statistics
        // The code calls knex('ventas') then knex('pagos')
        mockKnex
            .mockReturnValueOnce({ ...mockQueryBuilder, then: (r) => r([{ monto_total: 1000 }]) }) // ventas
            .mockReturnValueOnce({ ...mockQueryBuilder, then: (r) => r([{ monto: 500 }]) }); // pagos

        await getHandler(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            perfil: expect.objectContaining({ id: 1, nombre: 'Juan' }),
            estadisticas: expect.objectContaining({ total_compras: 1000, total_pagado: 500 })
        }));
    });

    test('should use provided cliente_id if user not associated (Admin case)', async () => {
        const req = { accountability: { user: 'admin-id' }, query: { cliente_id: 2 } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        
        // 1. Mock finding associated client -> None
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([]) 
        }));

        // 2. Mock debug ventas check
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([])
        }));

        // 3. Mock reading client details (Target ID 2)
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockResolvedValue({ id: 2, nombre: 'Pedro' })
        }));

        // 4. Mock reading ventas
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([])
        }));

        // 5. Mock Knex
        mockKnex.mockReturnValue({ ...mockQueryBuilder, then: (r) => r([]) });

        await getHandler(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            perfil: expect.objectContaining({ id: 2, nombre: 'Pedro' })
        }));
    });

    test('should return 404 if client not found', async () => {
        const req = { accountability: { user: 'user-id' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        
        // 1. Mock associated client
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([{ id: 1 }]) 
        }));

        // 2. Mock debug ventas check
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([])
        }));

        // 3. Mock reading client details -> Null
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockResolvedValue(null)
        }));

        await getHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle fallback if admin context fetch fails', async () => {
        // This tests lines 146-161 (catch and retry)
        const req = { accountability: { user: 'user-id' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockResolvedValue([{ id: 1 }]) })); // User lookup
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockResolvedValue([]) })); // Debug check
        ItemsService.mockImplementationOnce(() => ({ readOne: jest.fn().mockResolvedValue({ id: 1 }) })); // Client details
        
        // Admin Ventas fetch -> Fails
        const mockReadByQueryAdmin = jest.fn().mockRejectedValue(new Error('Admin Access Fail'));
        ItemsService.mockImplementationOnce(() => ({ readByQuery: mockReadByQueryAdmin }));

        // User Ventas fetch -> Succeeds
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockResolvedValue([{ id: 10 }]) }));

        // Mock Knex
        mockKnex.mockReturnValue({ ...mockQueryBuilder, then: (r) => r([]) });

        await getHandler(req, res);

        // Check that fallback was used (no explicit check, but if it didn't crash, it worked)
        expect(res.json).toHaveBeenCalled();
        expect(mockReadByQueryAdmin).toHaveBeenCalled();
    });

    test('should handle 403 error', async () => {
        const req = { accountability: { user: 'user-id' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockResolvedValue([{ id: 1 }]) })); 
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockResolvedValue([]) })); // Debug
        
        const error = new Error('Forbidden');
        error.status = 403;
        ItemsService.mockImplementationOnce(() => ({ readOne: jest.fn().mockRejectedValue(error) }));

        await getHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should handle 500 error', async () => {
        const req = { accountability: { user: 'user-id' }, query: {} };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        ItemsService.mockImplementationOnce(() => ({ readByQuery: jest.fn().mockRejectedValue(new Error('DB Fail')) })); 

        await getHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

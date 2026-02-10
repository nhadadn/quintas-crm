import clientesEndpoint from '../../../extensions/clientes/src/index.js';
import { mockContext } from '../setup';

// Mock middleware
jest.mock('../../../extensions/middleware/oauth-auth.mjs', () => ({
    createOAuthMiddleware: jest.fn(() => (req, res, next) => next()),
    requireScopes: jest.fn(() => (req, res, next) => next())
}));

// Mock express router
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Clientes Endpoint', () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    // Initialize endpoint
    clientesEndpoint(router, mockContext);
  });

  describe('Rate Limiter', () => {
    let rateLimiter;

    beforeEach(() => {
        // Capture the middleware function passed to router.use
        // First call is auth middleware, second is rate limiter
        const call = router.use.mock.calls[1]; 
        if (call && typeof call[0] === 'function') {
            rateLimiter = call[0];
        }
    });

    test('should allow requests under limit', () => {
        const req = { ip: '127.0.0.1', connection: {} };
        const res = mockRes();
        const next = jest.fn();

        if (rateLimiter) {
            for (let i = 0; i < 99; i++) {
                rateLimiter(req, res, next);
            }
            expect(next).toHaveBeenCalledTimes(99);
            expect(res.status).not.toHaveBeenCalled();
        }
    });

    test('should block requests over limit', () => {
        const req = { ip: '127.0.0.2', connection: {} };
        const res = mockRes();
        const next = jest.fn();

        if (rateLimiter) {
            for (let i = 0; i < 100; i++) {
                rateLimiter(req, res, next);
            }
            rateLimiter(req, res, next);
            expect(res.status).toHaveBeenCalledWith(429);
        }
    });
  });

  describe('GET /', () => {
    let getHandler;

    beforeEach(() => {
      // Find handler for '/'
      // args: path, middleware, handler
      const call = router.get.mock.calls.find(call => call[0] === '/');
      if (call) {
        getHandler = call[call.length - 1];
      }
    });

    test('should register GET / route', () => {
      expect(router.get).toHaveBeenCalledWith('/', expect.any(Function), expect.any(Function));
    });

    test('should return list of clientes', async () => {
      const req = { query: {}, accountability: { user: 'admin' } };
      const res = mockRes();
      
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 1, nombre: 'Juan' }]);

      await getHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, nombre: 'Juan' }] });
    });

    test('should filter by estatus and email', async () => {
        const req = { query: { estatus: 'activo', email: 'test@test.com' }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockResolvedValue([]);
  
        await getHandler(req, res);
  
        expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: expect.objectContaining({
                    _and: expect.arrayContaining([
                        { estatus: { _eq: 'activo' } },
                        { email: { _eq: 'test@test.com' } }
                    ])
                })
            })
        );
    });

    test('should search by name/apellido/rfc', async () => {
        const req = { query: { search: 'Juan' }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockResolvedValue([]);
  
        await getHandler(req, res);
  
        expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: expect.objectContaining({
                    _and: expect.arrayContaining([
                        expect.objectContaining({
                            _or: expect.arrayContaining([
                                { nombre: { _contains: 'Juan' } },
                                { apellido: { _contains: 'Juan' } },
                                { rfc: { _contains: 'Juan' } }
                            ])
                        })
                    ])
                })
            })
        );
    });

    test('should handle 500 error', async () => {
        const req = { query: {}, accountability: { user: 'admin' } };
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
      const call = router.get.mock.calls.find(call => call[0] === '/:id');
      if (call) {
        getByIdHandler = call[call.length - 1];
      }
    });

    test('should return cliente details with ventas', async () => {
        const req = { params: { id: 1 }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        // Mock Clientes Service
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockResolvedValue({ id: 1, nombre: 'Juan' })
        }));
        // Mock Ventas Service
        ItemsService.mockImplementationOnce(() => ({
            readByQuery: jest.fn().mockResolvedValue([{ id: 100, monto_total: 5000 }])
        }));

        await getByIdHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            data: {
                id: 1,
                nombre: 'Juan',
                ventas: [{ id: 100, monto_total: 5000 }]
            }
        });
    });

    test('should return 404 if not found', async () => {
        const req = { params: { id: 999 }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockResolvedValue(null)
        }));
        ItemsService.mockImplementationOnce(() => ({})); 

        await getByIdHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle 500 error', async () => {
        const req = { params: { id: 1 }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        ItemsService.mockImplementationOnce(() => ({
            readOne: jest.fn().mockRejectedValue(new Error('DB Error'))
        }));
        ItemsService.mockImplementationOnce(() => ({}));

        await getByIdHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('POST /', () => {
    let postHandler;

    beforeEach(() => {
      const call = router.post.mock.calls.find(call => call[0] === '/');
      if (call) {
        postHandler = call[call.length - 1];
      }
    });

    test('should create cliente successfully', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        // Mock checks (empty array = unique)
        itemsServiceInstance.readByQuery.mockResolvedValue([]);
        // Mock create
        itemsServiceInstance.createOne.mockResolvedValue(1);
        // Mock read back
        itemsServiceInstance.readOne.mockResolvedValue({ id: 1, email: 'juan@test.com' });

        await postHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({ data: { id: 1, email: 'juan@test.com' } });
    });

    test('should fail if required fields missing', async () => {
        const req = {
            body: { nombre: 'Juan' }, // Missing apellido, email
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errors: expect.arrayContaining([
                expect.objectContaining({ code: 'INVALID_PAYLOAD' })
            ])
        }));
    });

    test('should fail if email format invalid', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'bad-email' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail if email already exists', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'exist@test.com' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        // Mock email check (found)
        itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 2 }]);

        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail if RFC already exists', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com', rfc: 'RFC123' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        // Mock email check (not found)
        itemsServiceInstance.readByQuery.mockResolvedValueOnce([]);
        // Mock RFC check (found)
        itemsServiceInstance.readByQuery.mockResolvedValueOnce([{ id: 2 }]);

        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errors: expect.arrayContaining([
                expect.objectContaining({ message: expect.stringContaining('RFC') })
            ])
        }));
    });

    test('should handle DB duplicate error (race condition)', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockResolvedValue([]);
        const error = new Error('Dup');
        error.code = 'ER_DUP_ENTRY';
        itemsServiceInstance.createOne.mockRejectedValue(error);

        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errors: expect.arrayContaining([
                expect.objectContaining({ code: 'DUPLICATE_ENTRY' })
            ])
        }));
    });

    test('should handle 500 error', async () => {
        const req = {
            body: { nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));

        await postHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('PATCH /:id', () => {
    let patchHandler;

    beforeEach(() => {
      const call = router.patch.mock.calls.find(call => call[0] === '/:id');
      if (call) {
        patchHandler = call[call.length - 1];
      }
    });

    test('should update cliente successfully', async () => {
        const req = {
            params: { id: 1 },
            body: { nombre: 'Juan Update' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.updateOne.mockResolvedValue(1);
        itemsServiceInstance.readOne.mockResolvedValue({ id: 1, nombre: 'Juan Update' });

        await patchHandler(req, res);

        expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Juan Update' }));
    });

    test('should fail if updating to existing email', async () => {
        const req = {
            params: { id: 1 },
            body: { email: 'other@test.com' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 2 }]); // Found other user

        await patchHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail if updating to existing RFC', async () => {
        const req = {
            params: { id: 1 },
            body: { rfc: 'RFC999' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 2 }]); // Found other user

        await patchHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle DB duplicate error', async () => {
        const req = {
            params: { id: 1 },
            body: { nombre: 'Juan' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        const error = new Error('Dup');
        error.code = 'ER_DUP_ENTRY';
        itemsServiceInstance.updateOne.mockRejectedValue(error);

        await patchHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    test('should handle 500 error', async () => {
        const req = {
            params: { id: 1 },
            body: { nombre: 'Juan' },
            accountability: { user: 'admin' }
        };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.updateOne.mockRejectedValue(new Error('DB Fail'));

        await patchHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('DELETE /:id', () => {
    let deleteHandler;

    beforeEach(() => {
      const call = router.delete.mock.calls.find(call => call[0] === '/:id');
      if (call) {
        deleteHandler = call[call.length - 1];
      }
    });

    test('should soft delete cliente', async () => {
        const req = { params: { id: 1 }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.updateOne.mockResolvedValue(1);

        await deleteHandler(req, res);

        expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(1, { estatus: 'inactivo' });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('should handle 500 error', async () => {
        const req = { params: { id: 1 }, accountability: { user: 'admin' } };
        const res = mockRes();
        
        const { ItemsService } = mockContext.services;
        const itemsServiceInstance = new ItemsService();
        itemsServiceInstance.updateOne.mockRejectedValue(new Error('DB Fail'));

        await deleteHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

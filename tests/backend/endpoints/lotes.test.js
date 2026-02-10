import lotesEndpoint from '../../../extensions/directus-endpoint-lotes/src/index.js';
import { mockContext } from '../setup';

// Mock de Middleware
jest.mock('../../../extensions/middleware/oauth-auth.mjs', () => ({
  createOAuthMiddleware: jest.fn(() => (req, res, next) => {
    // Simular autenticación
    req.oauth = { user_id: 'user-123', scopes: ['read:lotes'] };
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

describe('Lotes API Extension', () => {
  let router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    // Inicializar el endpoint
    lotesEndpoint(router, mockContext);
  });

  describe('GET /', () => {
    let getHandler;

    beforeEach(() => {
      // Encontrar el handler registrado para GET /
      const call = router.get.mock.calls.find(call => call[0] === '/');
      if (call) {
        getHandler = call[call.length - 1];
      }
    });

    test('should register GET / route', () => {
      expect(router.get).toHaveBeenCalledWith('/', expect.any(Function), expect.any(Function));
    });

    test('should return list of lotes successfully', async () => {
      const req = {
        query: { page: 1, limit: 10 },
        accountability: { user: 'admin' }
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      const mockLotes = [
        { id: 'lote-1', numero_lote: 'L1', precio: 100000, estatus: 'disponible' },
        { id: 'lote-2', numero_lote: 'L2', precio: 120000, estatus: 'vendido' }
      ];

      itemsServiceInstance.readByQuery.mockResolvedValue(mockLotes);

      await getHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: mockLotes
      }));
    });

    test('should filter by status', async () => {
      const req = {
        query: { status: 'disponible' },
        accountability: { user: 'admin' }
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      itemsServiceInstance.readByQuery.mockResolvedValue([]);

      await getHandler(req, res);

      // Verificar que el filtro se pasó correctamente al servicio
      expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            _and: expect.arrayContaining([
              { estatus: { _eq: 'disponible' } }
            ])
          })
        })
      );
    });

    test('should filter by zona', async () => {
      const req = {
        query: { zona: 'Norte' },
        accountability: { user: 'admin' }
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
              { zona: { _eq: 'Norte' } }
            ])
          })
        })
      );
    });

    test('should use cache for list', async () => {
      const req = {
        query: { zona: 'Sur' },
        accountability: { user: 'admin' }
      };
      const res1 = mockRes();
      const res2 = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockResolvedValue([]);

      // First call
      await getHandler(req, res1);
      expect(res1.set).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Second call
      await getHandler(req, res2);
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
    });

    test('should handle generic error in GET /', async () => {
      const req = {
        query: {},
        accountability: { user: 'admin' }
      };
      const res = mockRes();
      
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readByQuery.mockRejectedValue(new Error('DB Error'));

      await getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
            expect.objectContaining({ message: 'DB Error' })
        ])
      }));
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

    test('should register GET /:id route', () => {
      expect(router.get).toHaveBeenCalledWith('/:id', expect.any(Function), expect.any(Function));
    });

    test('should return details of a specific lote', async () => {
      const req = {
        params: { id: 'lote-1' },
        accountability: { user: 'admin' }
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      const mockLote = {
        id: 'lote-1',
        numero_lote: 'L1',
        precio: 100000,
        estatus: 'disponible',
        imagenes: [
          { directus_files_id: 'img-1' },
          { id: 'img-2' } // Caso borde
        ]
      };

      itemsServiceInstance.readOne.mockResolvedValue(mockLote);
      mockContext.env = { PUBLIC_URL: 'http://localhost:8055' };

      await getByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          id: 'lote-1',
          imagenes: [
            'http://localhost:8055/assets/img-1', // Transformación de imagen esperada
            'http://localhost:8055/assets/img-2'
          ]
        })
      }));
    });

    test('should return 404 if lote not found', async () => {
      const req = {
        params: { id: 'non-existent' },
        accountability: { user: 'admin' }
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      itemsServiceInstance.readOne.mockResolvedValue(null);

      await getByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ code: 'NOT_FOUND' })
        ])
      }));
    });

    test('should return 403 if forbidden', async () => {
      const req = {
        params: { id: 'forbidden' },
        accountability: { user: 'admin' }
      };
      const res = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      const forbiddenError = new Error('Forbidden');
      forbiddenError.code = 'FORBIDDEN';
      itemsServiceInstance.readOne.mockRejectedValue(forbiddenError);

      await getByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should handle generic error in GET /:id', async () => {
      const req = {
        params: { id: 'l-error' },
        accountability: { user: 'admin' }
      };
      const res = mockRes();
      
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      itemsServiceInstance.readOne.mockRejectedValue(new Error('DB Detail Error'));

      await getByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
            expect.objectContaining({ message: 'DB Detail Error' })
        ])
      }));
    });

    test('should use cache for details', async () => {
      const req = {
        params: { id: 'l-cache' },
        accountability: { user: 'admin' }
      };
      const res1 = mockRes();
      const res2 = mockRes();

      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();
      
      itemsServiceInstance.readOne.mockResolvedValue({ id: 'l-cache' });
      mockContext.env = {};

      // First call
      await getByIdHandler(req, res1);
      expect(res1.set).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Second call
      await getByIdHandler(req, res2);
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
    });
  });
});

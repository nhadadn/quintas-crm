import { jest } from '@jest/globals';
import clientesEndpoint from '../../../../extensions/clientes/src/index.js';
import { mockContext, mockRouter, mockRes } from '../../setup';

// Mock middleware
jest.mock('../../../../extensions/middleware/oauth-auth.mjs', () => ({
  createOAuthMiddleware: jest.fn(() => (req, res, next) => next()),
  requireScopes: jest.fn(() => (req, res, next) => next()),
}));

describe('Clientes Extension', () => {
  let router;
  let getHandler;
  let getByIdHandler;
  let postHandler;
  let patchHandler;
  let deleteHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };

    // Call the extension function
    clientesEndpoint(router, mockContext);

    // Extract handler for GET /
    const getCall = router.get.mock.calls.find((call) => call[0] === '/');
    if (getCall) getHandler = getCall[getCall.length - 1];

    // Extract handler for GET /:id
    const getByIdCall = router.get.mock.calls.find((call) => call[0] === '/:id');
    if (getByIdCall) getByIdHandler = getByIdCall[getByIdCall.length - 1];

    // Extract handler for POST /
    const postCall = router.post.mock.calls.find((call) => call[0] === '/');
    if (postCall) postHandler = postCall[postCall.length - 1];

    // Extract handler for PATCH /:id
    const patchCall = router.patch.mock.calls.find((call) => call[0] === '/:id');
    if (patchCall) patchHandler = patchCall[patchCall.length - 1];

    // Extract handler for DELETE /:id
    const deleteCall = router.delete.mock.calls.find((call) => call[0] === '/:id');
    if (deleteCall) deleteHandler = deleteCall[deleteCall.length - 1];
  });

  test('should register GET / route', () => {
    expect(router.get).toHaveBeenCalledWith('/', expect.any(Function), expect.any(Function));
  });

  test('should list clients with default pagination', async () => {
    const req = { query: {}, accountability: { user: 'admin' } };
    const res = mockRes();
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();

    const mockClientes = [{ id: 1, nombre: 'Juan' }];
    itemsServiceInstance.readByQuery.mockResolvedValue(mockClientes);

    await getHandler(req, res);

    expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        page: 1,
        filter: {},
      })
    );
    expect(res.json).toHaveBeenCalledWith({ data: mockClientes });
  });

  test('should filter by estatus and email', async () => {
    const req = {
      query: { estatus: 'activo', email: 'test@example.com' },
      accountability: { user: 'admin' },
    };
    const res = mockRes();
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();

    await getHandler(req, res);

    expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          _and: [{ estatus: { _eq: 'activo' } }, { email: { _eq: 'test@example.com' } }],
        },
      })
    );
  });

  test('should search by name/rfc', async () => {
    const req = {
      query: { search: 'Lopez' },
      accountability: { user: 'admin' },
    };
    const res = mockRes();
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();

    await getHandler(req, res);

    expect(itemsServiceInstance.readByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          _and: [
            {
              _or: [
                { nombre: { _contains: 'Lopez' } },
                { apellido: { _contains: 'Lopez' } },
                { rfc: { _contains: 'Lopez' } },
              ],
            },
          ],
        },
      })
    );
  });

  test('should handle service errors', async () => {
    const req = { query: {}, accountability: { user: 'admin' } };
    const res = mockRes();
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();

    itemsServiceInstance.readByQuery.mockRejectedValue(new Error('Database error'));

    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ errors: [{ message: 'Database error' }] });
  });

  // =================================================================================
  // GET /clientes/:id
  // =================================================================================
  describe('GET /:id', () => {
    test('should return client details with sales', async () => {
      const req = { params: { id: 1 }, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      const mockCliente = { id: 1, nombre: 'Juan', apellido: 'Perez' };
      const mockVentas = [{ id: 101, monto_total: 5000 }];

      // Mock readOne for cliente
      itemsServiceInstance.readOne.mockResolvedValue(mockCliente);
      // Mock readByQuery for ventas (second instance call)
      itemsServiceInstance.readByQuery.mockResolvedValue(mockVentas);

      await getByIdHandler(req, res);

      expect(itemsServiceInstance.readOne).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          ...mockCliente,
          ventas: mockVentas,
        },
      });
    });

    test('should return 404 if client not found', async () => {
      const req = { params: { id: 999 }, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readOne.mockResolvedValue(null);

      await getByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: [{ message: 'Cliente 999 no encontrado' }] })
      );
    });
  });

  // =================================================================================
  // POST /clientes
  // =================================================================================
  describe('POST /', () => {
    test('should create a new client successfully', async () => {
      const payload = { nombre: 'Nuevo', apellido: 'Cliente', email: 'nuevo@test.com' };
      const req = { body: payload, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock check for existing email/rfc
      itemsServiceInstance.readByQuery.mockResolvedValue([]);
      // Mock createOne
      itemsServiceInstance.createOne.mockResolvedValue(2);
      // Mock readOne (return created client)
      itemsServiceInstance.readOne.mockResolvedValue({ id: 2, ...payload });

      await postHandler(req, res);

      expect(itemsServiceInstance.createOne).toHaveBeenCalledWith(expect.objectContaining(payload));
      expect(res.json).toHaveBeenCalledWith({ data: { id: 2, ...payload } });
    });

    test('should validate required fields', async () => {
      const req = { body: { nombre: 'Sin Apellido' }, accountability: { user: 'admin' } }; // Missing apellido, email
      const res = mockRes();

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'Nombre y Apellido son obligatorios', code: 'INVALID_PAYLOAD' }],
        })
      );
    });

    test('should validate email format', async () => {
      const req = {
        body: { nombre: 'Juan', apellido: 'Perez', email: 'invalid-email' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'Formato de email inválido', code: 'INVALID_PAYLOAD' }],
        })
      );
    });

    test('should prevent duplicate email', async () => {
      const payload = { nombre: 'Dup', apellido: 'Email', email: 'dup@test.com' };
      const req = { body: payload, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock existing email found
      itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 1, email: 'dup@test.com' }]);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            { message: 'El email dup@test.com ya está registrado.', code: 'INVALID_PAYLOAD' },
          ],
        })
      );
    });

    test('should handle DB duplicate error', async () => {
      const payload = { nombre: 'Race', apellido: 'Condition', email: 'race@test.com' };
      const req = { body: payload, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      itemsServiceInstance.readByQuery.mockResolvedValue([]); // No duplicate found initially

      const dbError = new Error('Duplicate entry');
      dbError.code = 'ER_DUP_ENTRY';
      itemsServiceInstance.createOne.mockRejectedValue(dbError);

      await postHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            { message: 'Registro duplicado (Email o RFC ya existe)', code: 'DUPLICATE_ENTRY' },
          ],
        })
      );
    });
  });

  // =================================================================================
  // PATCH /clientes/:id
  // =================================================================================
  describe('PATCH /:id', () => {
    test('should update client successfully', async () => {
      const req = {
        params: { id: 1 },
        body: { nombre: 'Updated' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock updateOne
      itemsServiceInstance.updateOne.mockResolvedValue(1);
      // Mock readOne (return updated)
      itemsServiceInstance.readOne.mockResolvedValue({ id: 1, nombre: 'Updated' });

      await patchHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(1, { nombre: 'Updated' });
      expect(res.json).toHaveBeenCalledWith({ data: { id: 1, nombre: 'Updated' } });
    });

    test('should prevent duplicate email on update', async () => {
      const req = {
        params: { id: 1 },
        body: { email: 'existing@test.com' },
        accountability: { user: 'admin' },
      };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      // Mock existing email found for OTHER user
      itemsServiceInstance.readByQuery.mockResolvedValue([{ id: 2, email: 'existing@test.com' }]);

      await patchHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [{ message: 'El email existing@test.com ya está usado por otro cliente.' }],
        })
      );
    });
  });

  // =================================================================================
  // DELETE /clientes/:id
  // =================================================================================
  describe('DELETE /:id', () => {
    test('should soft delete client', async () => {
      const req = { params: { id: 1 }, accountability: { user: 'admin' } };
      const res = mockRes();
      const { ItemsService } = mockContext.services;
      const itemsServiceInstance = new ItemsService();

      await deleteHandler(req, res);

      expect(itemsServiceInstance.updateOne).toHaveBeenCalledWith(1, { estatus: 'inactivo' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cliente 1 marcado como inactivo (Soft Delete)',
      });
    });
  });
});

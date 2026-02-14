import { jest } from '@jest/globals';
import hookExtension from '../../../extensions/directus-extension-hook-crm-logic/src/index.js';
import { mockContext } from '../setup';

describe('Hook: Validación de Inventario', () => {
  let filterMock;
  let actionMock;
  let registeredHooks = {};
  let itemsServiceMock;
  let databaseMock;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHooks = {};

    // Mock filter/action registration
    filterMock = jest.fn((event, handler) => {
      registeredHooks[`filter:${event}`] = handler;
    });
    actionMock = jest.fn((event, handler) => {
      registeredHooks[`action:${event}`] = handler;
    });

    // Mock Services & Database
    const { ItemsService } = mockContext.services;
    itemsServiceMock = {
      readOne: jest.fn(),
      updateOne: jest.fn(),
      createMany: jest.fn(),
    };
    ItemsService.mockImplementation(() => itemsServiceMock);

    // Mock Knex Database
    databaseMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };
    mockContext.database = databaseMock;

    // Load Extension
    hookExtension({ filter: filterMock, action: actionMock, schedule: jest.fn() }, mockContext);
  });

  describe('lotes.items.create', () => {
    test('should set default estatus to "disponible" if not provided', async () => {
      const handler = registeredHooks['filter:lotes.items.create'];
      const payload = { nombre: 'Lote 1' };

      const result = await handler(payload);

      expect(result.estatus).toBe('disponible');
    });

    test('should keep provided estatus', async () => {
      const handler = registeredHooks['filter:lotes.items.create'];
      const payload = { nombre: 'Lote 1', estatus: 'apartado' };

      const result = await handler(payload);

      expect(result.estatus).toBe('apartado');
    });
  });

  describe('ventas.items.create', () => {
    test('should throw error if lote_id is missing', async () => {
      const handler = registeredHooks['filter:ventas.items.create'];
      const payload = { cliente_id: 1 };

      await expect(handler(payload)).rejects.toThrow('El campo "lote_id" es obligatorio');
    });

    test('should throw error if lote does not exist', async () => {
      const handler = registeredHooks['filter:ventas.items.create'];
      const payload = { lote_id: 999 };

      databaseMock.first.mockResolvedValue(null);

      await expect(handler(payload)).rejects.toThrow('El lote con ID 999 no existe');
    });

    test('should throw error if lote is not available', async () => {
      const handler = registeredHooks['filter:ventas.items.create'];
      const payload = { lote_id: 1 };

      databaseMock.first.mockResolvedValue({ estatus: 'vendido' });

      await expect(handler(payload)).rejects.toThrow('El lote no está disponible');
    });

    test('should pass validation if lote is available', async () => {
      const handler = registeredHooks['filter:ventas.items.create'];
      const payload = { lote_id: 1 };

      databaseMock.first.mockResolvedValue({ estatus: 'disponible' });

      const result = await handler(payload);
      expect(result).toBe(payload);
    });
  });
});

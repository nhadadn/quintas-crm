import { jest } from '@jest/globals';
import hookExtension from '../../../extensions/directus-extension-hook-crm-logic/src/index.js';
import { mockContext } from '../setup';

describe('Hook: Generación de Amortizaciones', () => {
  let actionMock;
  let registeredHooks = {};
  let itemsServiceMock;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHooks = {};

    actionMock = jest.fn((event, handler) => {
      registeredHooks[event] = handler;
    });

    const { ItemsService } = mockContext.services;
    itemsServiceMock = {
      readOne: jest.fn(),
      updateOne: jest.fn(),
      createMany: jest.fn(),
    };
    ItemsService.mockImplementation(() => itemsServiceMock);

    hookExtension({ filter: jest.fn(), action: actionMock }, mockContext);
  });

  test('should generate amortizations for financed sales', async () => {
    const handler = registeredHooks['ventas.items.create'];
    const meta = { key: 1 };
    
    // Mock Venta Data
    itemsServiceMock.readOne.mockResolvedValue({
      id: 1,
      lote_id: 100,
      cliente_id: 50,
      metodo_pago: 'financiado',
      monto_total: 120000,
      enganche: 20000,
      plazo_meses: 12,
      tasa_interes: 12, // 1% mensual
      fecha_inicio: '2024-01-01',
    });

    await handler(meta, { schema: {}, accountability: { user: 'admin' } });

    // Verify Lote update
    expect(itemsServiceMock.updateOne).toHaveBeenCalledWith(100, expect.objectContaining({
      estatus: 'apartado',
      cliente_id: 50
    }));

    // Verify Pagos creation
    // First call is ventasService, second is lotesService, third is pagosService (inside generarTablaAmortizacion)
    // We need to check createMany calls
    expect(itemsServiceMock.createMany).toHaveBeenCalled();
    
    const createCalls = itemsServiceMock.createMany.mock.calls;
    const pagosCall = createCalls.find(call => call[0][0].numero_pago !== undefined);
    
    expect(pagosCall).toBeDefined();
    const pagos = pagosCall[0];
    
    expect(pagos).toHaveLength(12);
    expect(pagos[0].numero_pago).toBe(1);
    expect(pagos[0].estatus).toBe('pendiente');
    
    // Validate amounts (Principal 100,000, 12 months, 12% annual -> ~8884.88 monthly)
    // Just check total > principal
    const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    expect(totalPagado).toBeGreaterThan(100000);
  });

  test('should not generate amortizations for cash sales', async () => {
    const handler = registeredHooks['ventas.items.create'];
    const meta = { key: 2 };
    
    itemsServiceMock.readOne.mockResolvedValue({
      id: 2,
      metodo_pago: 'contado',
      lote_id: 101,
    });

    await handler(meta, { schema: {}, accountability: { user: 'admin' } });

    // Should create commissions but NOT amortizations
    // We expect createMany for commissions (concept check)
    const createCalls = itemsServiceMock.createMany.mock.calls;
    const pagosCall = createCalls.find(call => call[0][0].numero_pago !== undefined);
    
    expect(pagosCall).toBeUndefined();
  });
});

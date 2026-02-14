import { jest } from '@jest/globals';
import hookExtension from '../../../extensions/directus-extension-hook-crm-logic/src/index.js';
import { mockContext } from '../setup';

describe('Hook: Cálculo de Comisiones', () => {
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

    hookExtension({ filter: jest.fn(), action: actionMock, schedule: jest.fn() }, mockContext);
  });

  test('should calculate commissions based on vendor rate', async () => {
    const handler = registeredHooks['ventas.items.create'];
    const meta = { key: 1 };

    // Mock Venta
    itemsServiceMock.readOne
      .mockResolvedValueOnce({
        // Venta
        id: 1,
        vendedor_id: 10,
        monto_total: 100000,
        metodo_pago: 'contado',
      })
      .mockResolvedValueOnce({
        // Vendedor (called inside generarComisiones)
        id: 10,
        comision_porcentaje: 10, // 10% commission
      });

    await handler(meta, { schema: {}, accountability: { user: 'admin' } });

    // Verify Commissions
    expect(itemsServiceMock.createMany).toHaveBeenCalled();
    const calls = itemsServiceMock.createMany.mock.calls;
    console.log('Calls to createMany:', JSON.stringify(calls, null, 2));
    const comisionesCall = calls.find(
      (call) =>
        call[0] &&
        call[0][0] &&
        call[0][0].tipo_comision &&
        call[0][0].tipo_comision.includes('Comisión')
    );

    expect(comisionesCall).toBeDefined();
    const comisiones = comisionesCall[0];

    // Total Commission = 10,000 (10% of 100k)
    // Milestones: Enganche (30%), Contrato (30%), Liquidación (40%)

    expect(comisiones).toHaveLength(3);

    const enganche = comisiones.find((c) => c.tipo_comision.includes('Enganche'));
    expect(parseFloat(enganche.monto_comision)).toBe(3000); // 30% of 10,000

    const liquidacion = comisiones.find((c) => c.tipo_comision.includes('Liquidación'));
    expect(parseFloat(liquidacion.monto_comision)).toBe(4000); // 40% of 10,000
  });

  test('should use default commission rate if vendor not found or rate missing', async () => {
    const handler = registeredHooks['ventas.items.create'];
    const meta = { key: 1 };

    // Mock Venta
    itemsServiceMock.readOne
      .mockResolvedValueOnce({
        // Venta
        id: 1,
        vendedor_id: 11,
        monto_total: 100000,
        metodo_pago: 'contado',
      })
      .mockRejectedValueOnce(new Error('Vendedor not found')); // Vendedor fetch fails

    await handler(meta, { schema: {}, accountability: { user: 'admin' } });

    // Verify Commissions with default 5%
    const calls = itemsServiceMock.createMany.mock.calls;
    const comisionesCall = calls.find(
      (call) =>
        call[0] &&
        call[0][0] &&
        call[0][0].tipo_comision &&
        call[0][0].tipo_comision.includes('Comisión')
    );

    const comisiones = comisionesCall[0];

    // Total Commission = 5,000 (5% default of 100k)
    const enganche = comisiones.find((c) => c.tipo_comision.includes('Enganche'));
    expect(parseFloat(enganche.monto_comision)).toBe(1500); // 30% of 5,000
  });
});

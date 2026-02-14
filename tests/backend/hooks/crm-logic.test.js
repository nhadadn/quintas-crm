import crmLogicHook from '../../../extensions/directus-extension-hook-crm-logic/src/index.js';
import { mockContext, mockItemsService } from '../setup';

describe('CRM Logic Hook', () => {
  let filterHandlers = {};
  let actionHandlers = {};

  const mockRegister = {
    filter: jest.fn((event, handler) => {
      filterHandlers[event] = handler;
    }),
    action: jest.fn((event, handler) => {
      actionHandlers[event] = handler;
    }),
    schedule: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    filterHandlers = {};
    actionHandlers = {};
    if (mockContext.dbChain && mockContext.dbChain.setMockResponse) {
      mockContext.dbChain.setMockResponse([]); // Reset db mock response
    }
    // Reset console spy if needed, but jest.clearAllMocks handles spies created with jest.spyOn if restored?
    // We'll use spyOn in tests.
    crmLogicHook(mockRegister, mockContext);
  });

  describe('Filter: lotes.items.create', () => {
    test('should set default status to disponible', async () => {
      const handler = filterHandlers['lotes.items.create'];
      const payload = { numero_lote: 'L1' };
      const result = await handler(payload);
      expect(result.estatus).toBe('disponible');
    });

    test('should keep provided status', async () => {
      const handler = filterHandlers['lotes.items.create'];
      const payload = { numero_lote: 'L1', estatus: 'vendido' };
      const result = await handler(payload);
      expect(result.estatus).toBe('vendido');
    });

    test('should reset invalid status to disponible', async () => {
      const handler = filterHandlers['lotes.items.create'];
      const payload = { numero_lote: 'L1', estatus: 'invalido' };
      const result = await handler(payload);
      expect(result.estatus).toBe('disponible');
    });
  });

  describe('Filter: ventas.items.create', () => {
    let handler;

    beforeEach(() => {
      handler = filterHandlers['ventas.items.create'];
    });

    test('should throw if lote_id is missing', async () => {
      const payload = { cliente_id: 'c-1' };
      await expect(handler(payload)).rejects.toThrow('El campo "lote_id" es obligatorio');
    });

    test('should throw if lote does not exist', async () => {
      const payload = { lote_id: 'l-missing' };

      // Mock DB first() response
      mockContext.dbChain.first.mockResolvedValueOnce(undefined);

      await expect(handler(payload)).rejects.toThrow('no existe');
    });

    test('should throw if lote is not available', async () => {
      const payload = { lote_id: 'l-sold' };

      mockContext.dbChain.first.mockResolvedValueOnce({ estatus: 'vendido' });

      await expect(handler(payload)).rejects.toThrow('El lote no está disponible');
    });

    test('should pass if lote is available', async () => {
      const payload = { lote_id: 'l-ok' };

      mockContext.dbChain.first.mockResolvedValueOnce({ estatus: 'disponible' });

      const result = await handler(payload);
      expect(result).toBe(payload);
    });

    test('should handle generic database error', async () => {
      const payload = { lote_id: 'l-error' };

      mockContext.dbChain.first.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(handler(payload)).rejects.toThrow('DB connection failed');
    });
  });

  describe('Action: ventas.items.create', () => {
    let handler;

    beforeEach(() => {
      handler = actionHandlers['ventas.items.create'];
    });

    test('should update lote status and generate commissions (Contado)', async () => {
      const meta = { key: 'v-1' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      // 1. readOne(venta)
      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: 'v-1',
          lote_id: 'l-1',
          cliente_id: 'c-1',
          vendedor_id: 'vend-1',
          metodo_pago: 'contado',
          monto_total: 100000,
          enganche: 10000,
        })
        // 2. readOne(vendedor) for commissions
        .mockResolvedValueOnce({
          id: 'vend-1',
          comision_porcentaje: 5,
        });

      await handler(meta, context);

      // Verify Lote update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith(
        'l-1',
        expect.objectContaining({
          estatus: 'apartado',
          cliente_id: 'c-1',
        })
      );

      // Verify Commissions generated
      expect(mockItemsService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tipo_comision: 'Comisión Enganche' }),
          expect.objectContaining({ tipo_comision: 'Comisión Contrato' }),
          expect.objectContaining({ tipo_comision: 'Comisión Liquidación' }),
        ])
      );
    });

    test('should generate amortization table if financed', async () => {
      const meta = { key: 'v-financed' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      // 1. readOne(venta)
      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: 'v-financed',
          lote_id: 'l-2',
          cliente_id: 'c-1',
          vendedor_id: 'vend-1',
          metodo_pago: 'financiado',
          monto_total: 120000,
          enganche: 20000,
          plazo_meses: 12,
          tasa_interes: 10,
        })
        // 2. readOne(vendedor)
        .mockResolvedValueOnce({ id: 'vend-1' });

      await handler(meta, context);

      // Verify Amortization (Pagos) generated using DB direct insert
      // AmortizacionService uses database('amortizacion').insert(tabla)

      expect(mockContext.database).toHaveBeenCalledWith('amortizacion');
      expect(mockContext.dbChain.insert).toHaveBeenCalled();

      const insertCall = mockContext.dbChain.insert.mock.calls[0];
      const tabla = insertCall[0];

      expect(tabla).toHaveLength(12);
      expect(tabla[0].monto_cuota).toBeDefined();
    });

    test('should handle errors gracefully (log only)', async () => {
      const meta = { key: 'v-err' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockItemsService.readOne.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(handler(meta, context)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error en post-procesamiento'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Action: pagos.items.create', () => {
    let handler;

    beforeEach(() => {
      handler = actionHandlers['pagos.items.create'];
    });

    test('should ignore payment without venta_id', async () => {
      const meta = { key: 'p-loose' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      mockItemsService.readOne.mockResolvedValueOnce({ id: 'p-loose' }); // No venta_id

      await handler(meta, context);

      expect(mockItemsService.updateOne).not.toHaveBeenCalled();
    });

    test('should calculate mora if paid late', async () => {
      const meta = { key: 'p-late' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      // 1. readOne(pago)
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'p-late',
        venta_id: 'v-1',
        monto: 1000,
        fecha_programada: pastDate.toISOString(),
        estatus: 'pagado',
        notas: '',
        concepto: '',
      });

      // AmortizacionService queries:
      // 1. cuotasConMora
      // 2. cuotas (normal)

      // We mock cuotasConMora to return one overdue quota
      const mockCuotaMora = {
        id: 'cuota-1',
        venta_id: 'v-1',
        penalizacion_acumulada: 50,
        monto_cuota: 1000,
        estatus: 'pendiente',
        fecha_vencimiento: pastDate.toISOString(),
      };

      // Mock chained calls for DB selects
      // Using mockImplementationOnce for sequential select calls

      // First select is for cuotasConMora (penalizaciones check)
      mockContext.dbChain.then.mockImplementationOnce((resolve) => resolve([mockCuotaMora]));

      // Second select is for applying remaining payment (normal flow)
      // Since 50 went to mora, 950 remains.
      mockContext.dbChain.then.mockImplementationOnce((resolve) => resolve([mockCuotaMora]));

      // 3. Pendientes count check (in hook after registrarPago)
      mockContext.dbChain.first.mockResolvedValueOnce({ count: 1 }); // Still pending

      await handler(meta, context);

      // Verify Mora update (via DB update, not ItemsService)
      // Expect update on 'penalizaciones' table
      expect(mockContext.database).toHaveBeenCalledWith('penalizaciones');
      expect(mockContext.dbChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ aplicada: true })
      );

      // Expect update on 'amortizacion' table (reducing penalizacion_acumulada)
      expect(mockContext.database).toHaveBeenCalledWith('amortizacion');
    });

    test('should update venta to pagada if fully paid', async () => {
      const meta = { key: 'p-final' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      // 1. readOne(pago)
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'p-final',
        venta_id: 'v-full',
        monto: 1000,
        fecha_programada: new Date().toISOString(), // On time
        estatus: 'pagado',
        notas: '',
        concepto: '',
      });

      // Mock DB selects for registrarPago
      // 1. cuotasConMora -> []
      mockContext.dbChain.then.mockImplementationOnce((resolve) => resolve([]));

      // 2. cuotas (normal) -> [cuota]
      const mockCuota = {
        id: 'cuota-last',
        monto_cuota: 1000,
        monto_pagado: 0,
        estatus: 'pendiente',
        numero_pago: 12,
      };
      mockContext.dbChain.then.mockImplementationOnce((resolve) => resolve([mockCuota]));

      // Mock DB selects for hook logic (post-registrarPago)
      // 1. count pendientes -> 0
      // 2. sum saldo_final -> 0
      mockContext.dbChain.first
        .mockResolvedValueOnce({ count: 0 }) // pendientes count
        .mockResolvedValueOnce({ total: 0 }); // saldo total

      // Mock venta read for check
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'v-full',
        monto_total: 12000,
        estatus: 'pendiente',
        lote_id: 'l-full',
      });

      await handler(meta, context);

      // Verify Venta update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('v-full', { estatus: 'pagada' });

      // Verify Lote update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('l-full', { estatus: 'vendido' });
    });

    test('should handle errors in pagos.items.create gracefully', async () => {
      const meta = { key: 'p-error' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockItemsService.readOne.mockRejectedValue(new Error('DB Error'));

      await handler(meta, context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Additional Coverage', () => {
    let actionHandler;

    beforeEach(() => {
      actionHandler = actionHandlers['ventas.items.create'];
    });

    test('should calculate monthly payment with zero interest rate', async () => {
      const meta = { key: 'v-zero-interest' };
      const context = { schema: {}, accountability: { user: 'admin' } };

      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: 'v-zero-interest',
          metodo_pago: 'financiado',
          monto_total: 120000,
          enganche: 0,
          plazo_meses: 12,
          tasa_interes: 0, // Zero interest
        })
        .mockResolvedValueOnce({ id: 'vend-1' });

      await actionHandler(meta, context);

      // Verify insert call on DB
      const insertCall = mockContext.dbChain.insert.mock.calls.find(
        (call) => Array.isArray(call[0]) && call[0][0].numero_pago
      );
      const tabla = insertCall[0];

      // 120000 / 12 = 10000
      expect(tabla[0].monto_cuota).toBe('10000.00');
    });

    test('should use default commission if vendor not found or fails', async () => {
      const meta = { key: 'v-comm-fail' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      mockItemsService.readOne
        .mockResolvedValueOnce({
          id: 'v-comm-fail',
          metodo_pago: 'contado',
          monto_total: 100000,
          vendedor_id: 'vend-fail',
        })
        .mockRejectedValueOnce(new Error('Vendor lookup failed')); // Fail vendor lookup

      await actionHandler(meta, context);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('default 5%'));

      // Should default to 5% commission
      // 5% of 100,000 = 5,000.
      // Enganche (30%) = 1,500.
      expect(mockItemsService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ monto_comision: '1500.00' })])
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

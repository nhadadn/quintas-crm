
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    filterHandlers = {};
    actionHandlers = {};
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
      
      mockContext.database.select = jest.fn().mockReturnThis();
      mockContext.database.from = jest.fn().mockReturnThis();
      mockContext.database.where = jest.fn().mockReturnThis();
      mockContext.database.first = jest.fn().mockResolvedValue(undefined);

      await expect(handler(payload)).rejects.toThrow('no existe');
    });

    test('should throw if lote is not available', async () => {
      const payload = { lote_id: 'l-sold' };
      
      mockContext.database.select = jest.fn().mockReturnThis();
      mockContext.database.from = jest.fn().mockReturnThis();
      mockContext.database.where = jest.fn().mockReturnThis();
      mockContext.database.first = jest.fn().mockResolvedValue({ estatus: 'vendido' });

      await expect(handler(payload)).rejects.toThrow('El lote no está disponible');
    });

    test('should pass if lote is available', async () => {
      const payload = { lote_id: 'l-ok' };
      
      mockContext.database.select = jest.fn().mockReturnThis();
      mockContext.database.from = jest.fn().mockReturnThis();
      mockContext.database.where = jest.fn().mockReturnThis();
      mockContext.database.first = jest.fn().mockResolvedValue({ estatus: 'disponible' });

      const result = await handler(payload);
      expect(result).toBe(payload);
    });

    test('should handle generic database error', async () => {
      const payload = { lote_id: 'l-error' };
      
      mockContext.database.select = jest.fn().mockReturnThis();
      mockContext.database.from = jest.fn().mockReturnThis();
      mockContext.database.where = jest.fn().mockReturnThis();
      mockContext.database.first = jest.fn().mockRejectedValue(new Error('DB connection failed'));

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
          enganche: 10000
        })
        // 2. readOne(vendedor) for commissions
        .mockResolvedValueOnce({
          id: 'vend-1',
          comision_porcentaje: 5
        });

      await handler(meta, context);

      // Verify Lote update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('l-1', expect.objectContaining({
        estatus: 'apartado',
        cliente_id: 'c-1'
      }));

      // Verify Commissions generated
      expect(mockItemsService.createMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ tipo_comision: 'Comisión Enganche' }),
        expect.objectContaining({ tipo_comision: 'Comisión Contrato' }),
        expect.objectContaining({ tipo_comision: 'Comisión Liquidación' })
      ]));
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
          tasa_interes: 10
        })
        // 2. readOne(vendedor)
        .mockResolvedValueOnce({ id: 'vend-1' });

      await handler(meta, context);

      // Verify Amortization (Pagos) generated
      // First createMany call should be payments (or order doesn't strict, but we check calls)
      // We expect createMany to be called twice: one for pagos, one for comisiones
      
      const createManyCalls = mockItemsService.createMany.mock.calls;
      const pagosCall = createManyCalls.find(call => call[0][0].numero_pago !== undefined);
      
      expect(pagosCall).toBeDefined();
      expect(pagosCall[0]).toHaveLength(12); // 12 months
      expect(pagosCall[0][0].monto).toBeDefined();
    });

    test('should handle errors gracefully', async () => {
      const meta = { key: 'v-err' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      
      mockItemsService.readOne.mockRejectedValue(new Error('DB Error'));

      await expect(handler(meta, context)).rejects.toThrow('Error procesando venta: DB Error');
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
        mora: 0,
        estatus: 'pagado' // Assumed set to pagado on create? Or logic runs anyway. Code says: if fechaPago > fechaProgramada
        // Hook logic: const fechaPago = new Date(); // Current time
      });

      // 2. readByQuery (pagosVenta) - Return empty or whatever
      mockItemsService.readByQuery.mockResolvedValueOnce([]);
      
      // 3. readOne(venta)
      mockItemsService.readOne.mockResolvedValueOnce({ id: 'v-1', monto_total: 5000 });

      await handler(meta, context);

      // Verify Mora update
      // 5 days late, 5% of 1000 = 50
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('p-late', expect.objectContaining({
        mora: 50,
        notas: expect.stringContaining('Mora generada')
      }));
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
        estatus: 'pagado'
      });

      // 2. readByQuery (pagosVenta) - All paid
      mockItemsService.readByQuery.mockResolvedValueOnce([
        { monto: 1000, estatus: 'pagado' },
        { monto: 1000, estatus: 'pagado' } // Total 2000
      ]);

      // 3. readOne(venta)
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'v-full',
        monto_total: 2000,
        estatus: 'pendiente',
        lote_id: 'l-full'
      });

      await handler(meta, context);

      // Verify Venta update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('v-full', { estatus: 'pagada' });
      
      // Verify Lote update
      expect(mockItemsService.updateOne).toHaveBeenCalledWith('l-full', { estatus: 'vendido' });
    });

    test('should NOT update venta if pending payments exist', async () => {
      const meta = { key: 'p-partial' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      
      // 1. readOne(pago)
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'p-partial',
        venta_id: 'v-part',
        monto: 1000,
        estatus: 'pagado'
      });

      // 2. readByQuery (pagosVenta) - Some pending
      mockItemsService.readByQuery.mockResolvedValueOnce([
        { monto: 1000, estatus: 'pagado' },
        { monto: 1000, estatus: 'pendiente' }
      ]);

      // 3. readOne(venta)
      mockItemsService.readOne.mockResolvedValueOnce({
        id: 'v-part',
        monto_total: 2000,
        estatus: 'pendiente'
      });

      await handler(meta, context);

      // Verify Venta NOT updated
      expect(mockItemsService.updateOne).not.toHaveBeenCalledWith('v-part', { estatus: 'pagada' });
    });

    test('should handle errors in pagos.items.create gracefully', async () => {
      const meta = { key: 'p-error' };
      const context = { schema: {}, accountability: { user: 'admin' } };
      
      mockItemsService.readOne.mockRejectedValue(new Error('DB Error'));

      await handler(meta, context);
      
      // Should not throw, just log error
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
            tasa_interes: 0 // Zero interest
          })
          .mockResolvedValueOnce({ id: 'vend-1' });
  
        await actionHandler(meta, context);
  
        const createManyCalls = mockItemsService.createMany.mock.calls;
        const pagosCall = createManyCalls.find(call => call[0][0].numero_pago !== undefined);
        
        // 120000 / 12 = 10000
        expect(pagosCall[0][0].monto).toBe('10000.00');
    });

    test('should use default commission if vendor not found or fails', async () => {
        const meta = { key: 'v-comm-fail' };
        const context = { schema: {}, accountability: { user: 'admin' } };
        
        mockItemsService.readOne
          .mockResolvedValueOnce({
            id: 'v-comm-fail',
            metodo_pago: 'contado',
            monto_total: 100000,
            vendedor_id: 'vend-fail'
          })
          .mockRejectedValueOnce(new Error('Vendor lookup failed')); // Fail vendor lookup
  
        await actionHandler(meta, context);
  
        // Should default to 5% commission
        expect(mockItemsService.createMany).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ monto_comision: "1500.00" }), // 30% of 5000
        ]));
    });
  });
});

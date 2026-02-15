import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Services
vi.mock('../src/services/penalizaciones.service.js', () => {
  const MockPenalizacionesService = vi.fn();
  MockPenalizacionesService.prototype.calcularPenalizacionesVencidas = vi.fn();
  return { PenalizacionesService: MockPenalizacionesService };
});
vi.mock('../src/services/amortizacion.service.js', () => {
  const MockAmortizacionService = vi.fn();
  MockAmortizacionService.prototype.generarTabla = vi.fn();
  MockAmortizacionService.prototype.registrarPago = vi.fn();
  return { AmortizacionService: MockAmortizacionService };
});

import hooks from '../src/index.js';
import { PenalizacionesService } from '../src/services/penalizaciones.service.js';
import { AmortizacionService } from '../src/services/amortizacion.service.js';

describe('CRM Logic Hooks', () => {
  let filter, action, schedule;
  let services, database, getSchema;
  
  // Specific Service Mocks
  let mockVentasService, mockLotesService, mockPagosService, mockComisionesService, mockVendedoresService;
  let mockDatabase;

  beforeEach(() => {
    filter = vi.fn();
    action = vi.fn();
    schedule = vi.fn();

    mockVentasService = { readOne: vi.fn(), updateOne: vi.fn() };
    mockLotesService = { updateOne: vi.fn(), readOne: vi.fn() };
    mockPagosService = { readOne: vi.fn() };
    mockComisionesService = { createMany: vi.fn() };
    mockVendedoresService = { readOne: vi.fn() };

    // Mock ItemsService constructor
    // Note: Must use regular function for constructor, not arrow function
    services = {
      ItemsService: vi.fn(function(collection) {
          switch(collection) {
              case 'ventas': return mockVentasService;
              case 'lotes': return mockLotesService;
              case 'pagos': return mockPagosService;
              case 'comisiones': return mockComisionesService;
              case 'vendedores': return mockVendedoresService;
              default: return { readOne: vi.fn(), createMany: vi.fn(), updateOne: vi.fn() };
          }
      })
    };

    // Mock Database (Knex)
    // We need a function that returns itself for chaining
    const mockDbInstance = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereIn: vi.fn().mockReturnThis(),
        first: vi.fn(),
        insert: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
        count: vi.fn().mockReturnThis(),
        sum: vi.fn().mockReturnThis(),
    };
    
    mockDatabase = vi.fn(() => mockDbInstance);
    Object.assign(mockDatabase, mockDbInstance);

    database = mockDatabase;
    getSchema = vi.fn();
  });

  it('registers all hooks correctly', () => {
    hooks({ filter, action, schedule }, { services, database, getSchema });
    
    expect(filter).toHaveBeenCalledWith('lotes.items.create', expect.any(Function));
    expect(filter).toHaveBeenCalledWith('ventas.items.create', expect.any(Function));
    expect(action).toHaveBeenCalledWith('ventas.items.create', expect.any(Function));
    expect(action).toHaveBeenCalledWith('pagos.items.create', expect.any(Function));
    expect(schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });

  describe('lotes.items.create', () => {
    it('sets default status to disponible if missing', async () => {
      hooks({ filter, action, schedule }, { services, database, getSchema });
      const handler = filter.mock.calls.find(call => call[0] === 'lotes.items.create')[1];

      const payload = {};
      const result = await handler(payload);
      expect(result.estatus).toBe('disponible');
    });

    it('validates status is valid', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'lotes.items.create')[1];
  
        const payload = { estatus: 'invalid' };
        const result = await handler(payload);
        expect(result.estatus).toBe('disponible');
      });

      it('keeps valid status', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'lotes.items.create')[1];
  
        const payload = { estatus: 'apartado' };
        const result = await handler(payload);
        expect(result.estatus).toBe('apartado');
      });
  });

  describe('ventas.items.create (Filter)', () => {
    it('throws error if lote_id is missing', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        await expect(handler({})).rejects.toThrow('El campo "lote_id" es obligatorio.');
    });

    it('throws error if lote does not exist', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        mockDatabase.first.mockResolvedValueOnce(null);

        await expect(handler({ lote_id: '123' })).rejects.toThrow('El lote con ID 123 no existe.');
    });

    it('throws error if lote is not available', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        mockDatabase.first.mockResolvedValueOnce({ estatus: 'vendido' });

        await expect(handler({ lote_id: '123' })).rejects.toThrow('El lote no está disponible');
    });

    it('passes if lote is available', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = filter.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        mockDatabase.first.mockResolvedValueOnce({ estatus: 'disponible' });

        const payload = { lote_id: '123' };
        const result = await handler(payload);
        expect(result).toEqual(payload);
    });
  });

  describe('ventas.items.create (Action) - Comisiones', () => {
      it('generates commissions when creating a sale', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = action.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        // Setup Mock Data
        const venta = {
            id: 'venta-1',
            monto_total: 100000,
            vendedor_id: 'vendedor-1',
            lote_id: 'lote-1',
            metodo_pago: 'contado' // Skip amortization generation
        };
        const vendedor = {
            id: 'vendedor-1',
            comision_porcentaje: 5
        };

        mockVentasService.readOne.mockResolvedValue(venta);
        mockVendedoresService.readOne.mockResolvedValue(vendedor);

        const meta = { key: 'venta-1' };
        const context = { schema: {}, accountability: { admin: true } };

        await handler(meta, context);

        // Verify Lote Update
        expect(mockLotesService.updateOne).toHaveBeenCalledWith('lote-1', expect.objectContaining({
            estatus: 'apartado'
        }));

        // Verify Commissions
        expect(mockComisionesService.createMany).toHaveBeenCalled();
        const commissionsCall = mockComisionesService.createMany.mock.calls[0];
        const commissionsArg = commissionsCall[0];
        
        expect(commissionsArg).toHaveLength(3); // 3 milestones
        expect(commissionsArg[0]).toEqual(expect.objectContaining({
            venta_id: 'venta-1',
            vendedor_id: 'vendedor-1',
            monto_comision: '1500.00' // 100k * 5% * 30% = 1500
        }));
      });

      it('uses default 5% commission if seller has no commission rate', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = action.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        // Setup Mock Data
        const venta = {
            id: 'venta-default',
            monto_total: 100000,
            vendedor_id: 'vendedor-no-rate',
            lote_id: 'lote-1',
            metodo_pago: 'contado'
        };
        const vendedor = {
            id: 'vendedor-no-rate',
            // comision_porcentaje is missing
        };

        mockVentasService.readOne.mockResolvedValue(venta);
        mockVendedoresService.readOne.mockResolvedValue(vendedor);

        const meta = { key: 'venta-default' };
        const context = { schema: {}, accountability: { admin: true } };

        await handler(meta, context);

        expect(mockComisionesService.createMany).toHaveBeenCalled();
        const commissionsCall = mockComisionesService.createMany.mock.calls[0];
        const commissionsArg = commissionsCall[0];
        
        // Default is 5%. 100k * 5% = 5000. Milestone 30% = 1500.
        expect(commissionsArg[0]).toEqual(expect.objectContaining({
            monto_comision: '1500.00'
        }));
      });

      it('generates amortization table if payment method is financiado', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = action.mock.calls.find(call => call[0] === 'ventas.items.create')[1];

        const venta = {
            id: 'venta-financiada',
            monto_total: 100000,
            vendedor_id: 'vendedor-1',
            lote_id: 'lote-1',
            metodo_pago: 'financiado'
        };
        mockVentasService.readOne.mockResolvedValue(venta);
        mockVendedoresService.readOne.mockResolvedValue({});

        await handler({ key: 'venta-financiada' }, { schema: {}, accountability: {} });

        expect(AmortizacionService).toHaveBeenCalled();
        // Check if any instance called generarTabla with our venta
        const instances = AmortizacionService.mock.instances;
        const called = instances.some(instance => {
            return instance.generarTabla.mock.calls.length > 0 && 
                   instance.generarTabla.mock.calls[0][0] === venta;
        });
        expect(called).toBe(true);
      });
  });

  describe('schedule (Cron)', () => {
    it('executes penalizaciones calculation daily', async () => {
        hooks({ filter, action, schedule }, { services, database, getSchema });
        const handler = schedule.mock.calls.find(call => call[0] === '0 0 * * *')[1];
        
        await handler();
        
        expect(PenalizacionesService).toHaveBeenCalled();
        const instances = PenalizacionesService.mock.instances;
        const called = instances.some(instance => {
            return instance.calcularPenalizacionesVencidas.mock.calls.length > 0;
        });
        expect(called).toBe(true);
    });
  });
});

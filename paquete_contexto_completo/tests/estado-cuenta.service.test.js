import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstadoCuentaService } from '../src/estado-cuenta.service.js';

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(function () {
      return {
        setFontSize: vi.fn(),
        text: vi.fn(),
        autoTable: vi.fn(),
        output: vi.fn().mockReturnValue(Buffer.from('PDF Content')),
        lastAutoTable: { finalY: 100 },
      };
    }),
  };
});

describe('EstadoCuentaService', () => {
  let service;
  let mockDatabase;

  // Helper to create a chainable mock
  const createChain = (resolution, isPromise = true) => {
    const chain = {
      join: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereNot: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(Array.isArray(resolution) ? resolution[0] : resolution),
      sum: vi.fn().mockResolvedValue([{ total: resolution }]),
      count: vi.fn().mockResolvedValue([{ count: resolution }]),
    };

    if (isPromise) {
      chain.then = (resolve) => resolve(resolution);
    }

    return chain;
  };

  beforeEach(() => {
    mockDatabase = vi.fn();
    service = new EstadoCuentaService({
      database: mockDatabase,
      services: {},
      schema: {},
      accountability: {},
    });
  });

  describe('generarEstadoCuenta', () => {
    it('generates account statement data correctly', async () => {
      const ventaId = 'venta-123';

      const mockVenta = {
        id: ventaId,
        monto_total: 100000,
        enganche: 10000,
        cliente_nombre: 'Juan',
        apellido_paterno: 'Perez',
        lote_identificador: 'Lote 1',
        lote_direccion: 'Calle Falsa 123',
      };

      const mockResumen = {
        pagos_totales: 2000,
        saldo_actual: 90000,
        penalizaciones_pendientes: 50,
      };

      const mockPagos = [
        {
          fecha_pago: '2023-01-01',
          monto: 1000,
          metodo_pago: 'efectivo',
          estatus: 'pagado',
          notas: '',
        },
      ];

      const mockAmortizacion = [{ numero_pago: 1, monto_cuota: 1000, estatus: 'pagado' }];

      // Spy on internal method
      service.obtenerResumenFinanciero = vi.fn().mockResolvedValue(mockResumen);

      // Sequence of DB calls in generarEstadoCuenta (excluding those in obtenerResumenFinanciero)
      // 1. Venta Info
      mockDatabase.mockReturnValueOnce(createChain(mockVenta));
      // 2. Historial Pagos
      mockDatabase.mockReturnValueOnce(createChain(mockPagos));
      // 3. Amortizacion Table
      mockDatabase.mockReturnValueOnce(createChain(mockAmortizacion));

      const result = await service.generarEstadoCuenta(ventaId);

      expect(mockDatabase).toHaveBeenCalledTimes(3);
      expect(service.obtenerResumenFinanciero).toHaveBeenCalledWith(ventaId, mockVenta);
      expect(result.venta.id).toBe(ventaId);
      expect(result.resumen).toEqual(mockResumen);
      expect(result.historial_pagos).toHaveLength(1);
    });

    it('throws error if sale not found', async () => {
      mockDatabase.mockReturnValueOnce(createChain(null));
      await expect(service.generarEstadoCuenta('bad-id')).rejects.toThrow('Venta no encontrada');
    });
  });

  describe('obtenerResumenFinanciero', () => {
    it('calculates financial summary correctly', async () => {
      const ventaId = 'venta-123';
      const mockPagos = [
        { monto: 1000, notas: 'Abono Capital' },
        { monto: 1000, notas: 'Pago Normal' },
      ];

      const mockAmortizacionFirstPending = {
        saldo_inicial: 90000,
        fecha_vencimiento: '2023-02-01',
        monto_cuota: 1000,
      };

      // 1. Pagos Totales
      mockDatabase.mockReturnValueOnce(createChain(mockPagos));
      // 2. Penalizaciones Pagadas
      mockDatabase.mockReturnValueOnce(createChain(0)); // total 0
      // 3. Penalizaciones Pendientes
      mockDatabase.mockReturnValueOnce(createChain(50)); // total 50
      // 4. Saldo Actual (First Pending)
      mockDatabase.mockReturnValueOnce(createChain(mockAmortizacionFirstPending));
      // 5. Cuotas Atrasadas
      mockDatabase.mockReturnValueOnce(createChain(1)); // count 1

      const result = await service.obtenerResumenFinanciero(ventaId);

      expect(result.pagos_totales).toBe(2000);
      expect(result.abonos_capital).toBe(1000); // Only the first one
      expect(result.saldo_actual).toBe(90000);
      expect(result.penalizaciones_pendientes).toBe(50);
      expect(result.cuotas_atrasadas).toBe(1);
    });

    it('handles no pending installments (fully paid)', async () => {
      const ventaId = 'venta-123';
      // 1. Pagos
      mockDatabase.mockReturnValueOnce(createChain([]));
      // 2. Penalizaciones Pagadas
      mockDatabase.mockReturnValueOnce(createChain(0));
      // 3. Penalizaciones Pendientes
      mockDatabase.mockReturnValueOnce(createChain(0));
      // 4. Saldo Actual (First Pending) -> null
      mockDatabase.mockReturnValueOnce(createChain(null));
      // 5. Saldo Actual (Last Paid - Fallback)
      mockDatabase.mockReturnValueOnce(createChain({ saldo_final: 0 }));
      // 6. Cuotas Atrasadas
      mockDatabase.mockReturnValueOnce(createChain(0));

      const result = await service.obtenerResumenFinanciero(ventaId);

      expect(result.saldo_actual).toBe(0);
    });
  });

  describe('exportarAPDF', () => {
    it('generates PDF buffer', async () => {
      const mockData = {
        venta: {
          id: 'v1',
          cliente: { nombre: 'Juan' },
          propiedad: { identificador: 'L1' },
          numero_contrato: '123',
          precio_total: 1000,
          enganche: 100,
          saldo_inicial: 900,
        },
        resumen: {
          saldo_actual: 500,
          pagos_totales: 400,
          penalizaciones_pendientes: 0,
        },
        historial_pagos: [],
        amortizacion: [],
      };

      // Mock generarEstadoCuenta
      service.generarEstadoCuenta = vi.fn().mockResolvedValue(mockData);

      const buffer = await service.exportarAPDF('v1');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe('PDF Content');
      expect(service.generarEstadoCuenta).toHaveBeenCalledWith('v1');
    });
  });
});

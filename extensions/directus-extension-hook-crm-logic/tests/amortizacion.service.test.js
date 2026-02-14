import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmortizacionService } from '../src/services/amortizacion.service.js';

// Mock crypto.randomUUID
vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-123',
}));

describe('AmortizacionService', () => {
  let service;
  let mockDatabase;
  let mockQueryBuilder;

  beforeEach(() => {
    mockQueryBuilder = {};

    // Explicitly define methods to return the object itself
    mockQueryBuilder.insert = vi.fn().mockResolvedValue(true);
    mockQueryBuilder.where = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.whereIn = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.whereNot = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update = vi.fn().mockResolvedValue(true);
    mockQueryBuilder.del = vi.fn().mockResolvedValue(true); // Add del mock
    mockQueryBuilder.first = vi.fn().mockResolvedValue(null);
    mockQueryBuilder.orderBy = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);

    // Make the database function return the query builder
    mockDatabase = vi.fn(() => mockQueryBuilder);

    service = new AmortizacionService({
      database: mockDatabase,
      services: {},
      schema: {},
      accountability: {},
    });
  });

  describe('generarTabla', () => {
    it('generates correct amortization table for standard loan', async () => {
      const venta = {
        id: 'venta-1',
        monto_total: 12000,
        enganche: 2000,
        plazo_meses: 10,
        tasa_interes: 12, // 1% monthly
        fecha_inicio: '2024-01-01',
      };

      const tabla = await service.generarTabla(venta);

      expect(tabla).toHaveLength(10);
      expect(mockDatabase).toHaveBeenCalledWith('amortizacion');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(tabla);

      // Principal = 10000
      // Monthly Rate = 0.01
      // Months = 10
      // Payment = 10000 * (0.01 * 1.01^10) / (1.01^10 - 1) = 1055.82
      const firstPayment = tabla[0];
      expect(firstPayment.monto_cuota).toBe('1055.82');
      expect(firstPayment.numero_pago).toBe(1);
      expect(firstPayment.estatus).toBe('pendiente');
    });

    it('generates correct table for 0% interest', async () => {
      const venta = {
        id: 'venta-2',
        monto_total: 10000,
        enganche: 0,
        plazo_meses: 10,
        tasa_interes: 0,
        fecha_inicio: '2024-01-01',
      };

      const tabla = await service.generarTabla(venta);

      expect(tabla).toHaveLength(10);
      expect(tabla[0].monto_cuota).toBe('1000.00');
      expect(tabla[0].interes).toBe('0.00');
      expect(tabla[0].capital).toBe('1000.00');
    });
  });

  describe('registrarPago', () => {
    it('applies payment to pending installments', async () => {
      const pago = {
        id: 'pago-1',
        venta_id: 'venta-1',
        monto: 1055.82,
        notas: 'Pago normal',
      };

      // Mock sequence for calls inside registrarPago:
      // 1. Check penalties (orderBy) -> returns []
      // 2. Get pending installments (orderBy) -> returns [...]

      mockQueryBuilder.orderBy
        .mockResolvedValueOnce([]) // 1. Penalties
        .mockResolvedValueOnce([
          // 2. Pending Installments
          {
            id: 'cuota-1',
            monto_cuota: 1055.82,
            monto_pagado: 0,
            estatus: 'pendiente',
            numero_pago: 1,
          },
          {
            id: 'cuota-2',
            monto_cuota: 1055.82,
            monto_pagado: 0,
            estatus: 'pendiente',
            numero_pago: 2,
          },
        ]);

      await service.registrarPago(pago);

      // Should update cuota-1 to pagado
      expect(mockDatabase).toHaveBeenCalledWith('amortizacion');

      // Verify update call arguments matching actual implementation
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        monto_pagado: 1055.82,
        estatus: 'pagado',
        fecha_pago: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('handles partial payment', async () => {
      const pago = {
        id: 'pago-2',
        venta_id: 'venta-1',
        monto: 500,
        notas: 'Pago parcial',
      };

      mockQueryBuilder.orderBy
        .mockResolvedValueOnce([]) // 1. Penalties
        .mockResolvedValueOnce([
          // 2. Pending Installments
          {
            id: 'cuota-1',
            monto_cuota: 1000,
            monto_pagado: 0,
            estatus: 'pendiente',
            numero_pago: 1,
          },
        ]);

      await service.registrarPago(pago);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        monto_pagado: 500,
        estatus: 'parcial',
        fecha_pago: null,
        updated_at: expect.any(Date),
      });
    });

    it('prioritizes penalty payments', async () => {
      const pago = {
        id: 'pago-3',
        venta_id: 'venta-1',
        monto: 200, // Pays full penalty of 100, then 100 to capital
        notas: 'Pago con mora',
      };

      mockQueryBuilder.orderBy
        .mockResolvedValueOnce([
          // 1. Penalties
          { id: 'cuota-vencida-1', penalizacion_acumulada: 100, estatus: 'vencido' },
        ])
        .mockResolvedValueOnce([
          // 2. Pending Installments (for remaining amount)
          {
            id: 'cuota-vencida-1',
            monto_cuota: 1000,
            monto_pagado: 0,
            estatus: 'vencido',
            numero_pago: 1,
          },
        ]);

      await service.registrarPago(pago);

      // Expect update on penalizaciones table
      expect(mockDatabase).toHaveBeenCalledWith('penalizaciones');

      // Expect update on amortizacion (reducing penalty)
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        penalizacion_acumulada: 0,
      });

      // Expect update on pagos (recording moratorium amount)
      expect(mockDatabase).toHaveBeenCalledWith('pagos');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        monto_moratorio: 100,
      });
    });

    it('handles capital payment (REDUCIR_CUOTA)', async () => {
      const pago = {
        id: 'pago-cap-1',
        venta_id: 'venta-cap',
        monto: 5000,
        notas: 'ABONO A CAPITAL',
      };

      // Mocks for registrarPago flow
      mockQueryBuilder.orderBy.mockResolvedValueOnce([]); // No penalties

      // Mocking ventas query inside aplicarAbonoCapital
      mockQueryBuilder.first.mockResolvedValueOnce({ tasa_interes: 12 });

      // Mocking cuotasFuturas query inside aplicarAbonoCapital
      const mockCuotas = Array.from({ length: 10 }, (_, i) => ({
        id: `cuota-${i + 1}`,
        saldo_inicial: 10000,
        monto_cuota: 1000,
        estatus: 'pendiente',
        numero_pago: i + 1,
        notas: '',
      }));

      // Mock return for cuotasFuturas query
      mockQueryBuilder.orderBy.mockResolvedValueOnce(mockCuotas);

      await service.registrarPago(pago);

      // Verify database update calls for re-amortization
      // Should update 10 quotas
      // We can't easily check all args, but we can check if it called update with [Abono Capital] note
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: expect.stringContaining('[Abono Capital] Reducción Cuota'),
        })
      );
    });

    it('handles capital payment (REDUCIR_PLAZO)', async () => {
      const pago = {
        id: 'pago-plazo-1',
        venta_id: 'venta-plazo',
        monto: 5000,
        notas: 'ABONO A CAPITAL PLAZO',
      };

      // Mocks for registrarPago flow
      mockQueryBuilder.orderBy.mockResolvedValueOnce([]); // No penalties

      // Mocking ventas query
      mockQueryBuilder.first.mockResolvedValueOnce({ tasa_interes: 12 });

      // Mocking cuotasFuturas query
      const mockCuotas = Array.from({ length: 20 }, (_, i) => ({
        id: `cuota-${i + 1}`,
        saldo_inicial: 20000,
        monto_cuota: 1000,
        estatus: 'pendiente',
        numero_pago: i + 1,
        notas: '',
      }));

      mockQueryBuilder.orderBy.mockResolvedValueOnce(mockCuotas);

      await service.registrarPago(pago);

      // Should verify that some quotas were deleted (excess)
      expect(mockDatabase).toHaveBeenCalledWith('amortizacion');
      expect(mockQueryBuilder.del).toHaveBeenCalled();

      // Should update remaining quotas
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notas: expect.stringContaining('[Abono Capital] Reducción Plazo'),
        })
      );
    });
    it('handles capital payment (REDUCIR_PLAZO) with 0% interest', async () => {
      const pago = {
        id: 'pago-capital-0',
        venta_id: 'venta-0',
        monto: 2000,
        tipo_pago: 'abono_capital',
        estrategia: 'REDUCIR_PLAZO',
        notas: 'ABONO CAPITAL PLAZO', // Trigger detection logic
      };

      // 1. Penalties (empty)
      mockQueryBuilder.orderBy.mockResolvedValueOnce([]);

      // 2. Pending Installments (20 remaining, 1000 each, 0 interest)
      const pending = Array.from({ length: 20 }, (_, i) => ({
        id: `cuota-${i + 1}`,
        saldo_inicial: (20000 - i * 1000).toFixed(2),
        monto_cuota: '1000.00',
        interes: '0.00',
        capital: '1000.00',
        numero_pago: i + 1,
      }));
      mockQueryBuilder.orderBy.mockResolvedValueOnce(pending);

      // 3. Venta details (0% interest)
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: 'venta-0',
        tasa_interes: 0,
      });

      await service.registrarPago(pago);

      expect(mockDatabase).toHaveBeenCalledWith('ventas');
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it('fallbacks to REDUCIR_CUOTA if quota does not cover new interest', async () => {
        const pago = {
          id: 'pago-capital-fallback',
          venta_id: 'venta-high-interest',
          monto: 1000, // Small payment
          tipo_pago: 'abono_capital',
          estrategia: 'REDUCIR_PLAZO',
          notas: 'ABONO CAPITAL PLAZO', // Trigger detection logic
        };
  
        // 1. Penalties (empty)
        mockQueryBuilder.orderBy.mockResolvedValueOnce([]);
  
        // 2. Pending Installments (First call - REDUCIR_PLAZO)
        // Huge debt, small quota
        const pending = Array.from({ length: 20 }, (_, i) => ({
          id: `cuota-${i + 1}`,
          saldo_inicial: '100000.00',
          monto_cuota: '100.00', // Very small quota
          interes: '500.00', // Interest is higher than quota!
          capital: '-400.00',
          numero_pago: i + 1,
        }));
        mockQueryBuilder.orderBy.mockResolvedValueOnce(pending);

        // 3. Pending Installments (Second call - REDUCIR_CUOTA fallback)
        // Need to return the same pending installments for the recursive call
        mockQueryBuilder.orderBy.mockResolvedValueOnce(pending);
  
        // 3. Venta details (High interest)
        // The first call gets venta details
        mockQueryBuilder.first.mockResolvedValueOnce({
          id: 'venta-high-interest',
          tasa_interes: 50, // 50% annual
        });

        // The second call (recursive) also gets venta details!
        mockQueryBuilder.first.mockResolvedValueOnce({
            id: 'venta-high-interest',
            tasa_interes: 50, // 50% annual
        });
        
        // Spy on console.warn
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  
        await service.registrarPago(pago);
  
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No se puede reducir plazo'));
        // Should NOT delete quotas (as it switched to REDUCIR_CUOTA)
        expect(mockQueryBuilder.del).not.toHaveBeenCalled();
        // Should update quotas
        expect(mockQueryBuilder.update).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('handles capital payment (REDUCIR_CUOTA) with 0% interest', async () => {
        const pago = {
          id: 'pago-capital-cuota-0',
          venta_id: 'venta-0',
          monto: 2000,
          tipo_pago: 'abono_capital',
          estrategia: 'REDUCIR_CUOTA',
          notas: 'ABONO CAPITAL', // Trigger detection logic (default is REDUCIR_CUOTA)
        };
  
        // 1. Penalties (empty)
        mockQueryBuilder.orderBy.mockResolvedValueOnce([]);
  
        // 2. Pending Installments (20 remaining, 1000 each, 0 interest)
        const pending = Array.from({ length: 20 }, (_, i) => ({
          id: `cuota-${i + 1}`,
          saldo_inicial: (20000 - i * 1000).toFixed(2),
          monto_cuota: '1000.00',
          interes: '0.00',
          capital: '1000.00',
          numero_pago: i + 1,
        }));
        mockQueryBuilder.orderBy.mockResolvedValueOnce(pending);
  
        // 3. Venta details (0% interest)
        mockQueryBuilder.first.mockResolvedValueOnce({
          id: 'venta-0',
          tasa_interes: 0,
        });
  
        await service.registrarPago(pago);
  
        expect(mockDatabase).toHaveBeenCalledWith('ventas');
        expect(mockQueryBuilder.update).toHaveBeenCalledWith(
            expect.objectContaining({
                monto_cuota: '900.00',
                interes: '0.00',
                capital: '900.00'
            })
        );
    });
  });
});

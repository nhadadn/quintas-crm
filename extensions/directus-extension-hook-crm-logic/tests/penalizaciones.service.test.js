import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PenalizacionesService } from '../src/services/penalizaciones.service.js';

// Mock crypto.randomUUID
vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-123',
}));

describe('PenalizacionesService', () => {
  let service;
  let mockDatabase;

  beforeEach(() => {
    // Basic mock structure
    mockDatabase = vi.fn();

    service = new PenalizacionesService({
      database: mockDatabase,
      services: {},
      schema: {},
      accountability: {},
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('calcularPenalizacionesVencidas', () => {
    it('calculates penalties for overdue installments', async () => {
      // Setup dates
      const today = new Date('2024-02-15T12:00:00Z');
      vi.setSystemTime(today);
      const dueDate = '2024-02-01'; // 14 days ago. 14 - 5 grace = 9 days late.

      // Mock DB calls in sequence

      // 1. Config
      const configMock = {
        first: vi.fn().mockResolvedValue({ tasa_mensual: 3, periodo_gracia_dias: 5 }),
      };
      mockDatabase.mockReturnValueOnce(configMock);

      // 2. Fetch Overdue Installments
      const cuotasVencidas = [
        { id: 'cuota-1', fecha_vencimiento: dueDate, monto_cuota: 1000, estatus: 'pendiente' },
      ];
      const fetchMock = {
        whereIn: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(cuotasVencidas),
      };
      mockDatabase.mockReturnValueOnce(fetchMock);

      // 3. Check Existing Penalty (for cuota-1)
      const penaltyCheckMock = {
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null), // No existing penalty
      };
      mockDatabase.mockReturnValueOnce(penaltyCheckMock);

      // 4. Insert Penalty
      const penaltyInsertMock = { insert: vi.fn().mockResolvedValue(true) };
      mockDatabase.mockReturnValueOnce(penaltyInsertMock);

      // 5. Update Amortization
      const amortUpdateMock = {
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue(true),
      };
      mockDatabase.mockReturnValueOnce(amortUpdateMock);

      await service.calcularPenalizacionesVencidas();

      // Verification
      // 1. Config fetched
      expect(mockDatabase).toHaveBeenNthCalledWith(1, 'configuracion_penalizaciones');

      // 2. Overdue fetched
      expect(mockDatabase).toHaveBeenNthCalledWith(2, 'amortizacion');

      // 4. Penalty Inserted
      expect(mockDatabase).toHaveBeenNthCalledWith(4, 'penalizaciones');
      expect(penaltyInsertMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          amortizacion_id: 'cuota-1',
          dias_atraso: 9, // 14 - 5
          // Rate: 3% / 30 = 0.1% daily = 0.001
          // Amount: 1000 * 0.001 * 9 = 9
          monto_penalizacion: 9,
          aplicada: false,
        })
      );

      // 5. Amortization Updated
      expect(mockDatabase).toHaveBeenNthCalledWith(5, 'amortizacion');
      expect(amortUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          penalizacion_acumulada: 9,
          dias_atraso: 9,
        })
      );
    });

    it('updates existing penalty record if already exists', async () => {
        // Setup dates
        const today = new Date('2024-02-15T12:00:00Z');
        vi.setSystemTime(today);
        const dueDate = '2024-02-01'; // 14 days ago. 14 - 5 grace = 9 days late.
  
        // Mock DB calls
        // 1. Config
        mockDatabase.mockReturnValueOnce({
          first: vi.fn().mockResolvedValue({ tasa_mensual: 3, periodo_gracia_dias: 5 }),
        });
  
        // 2. Fetch Overdue
        const cuotasVencidas = [
          { id: 'cuota-1', fecha_vencimiento: dueDate, monto_cuota: 1000, estatus: 'pendiente' },
        ];
        mockDatabase.mockReturnValueOnce({
          whereIn: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(cuotasVencidas),
        });
  
        // 3. Check Existing Penalty -> RETURNS EXISTING
        const existingPenalty = { id: 'penalizacion-existing-1', amortizacion_id: 'cuota-1' };
        mockDatabase.mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(existingPenalty),
        });
  
        // 4. Update Penalty (Not Insert)
        const penaltyUpdateMock = {
            where: vi.fn().mockReturnThis(),
            update: vi.fn().mockResolvedValue(true)
        };
        mockDatabase.mockReturnValueOnce(penaltyUpdateMock);
  
        // 5. Update Amortization
        const amortUpdateMock = {
          where: vi.fn().mockReturnThis(),
          update: vi.fn().mockResolvedValue(true),
        };
        mockDatabase.mockReturnValueOnce(amortUpdateMock);
  
        await service.calcularPenalizacionesVencidas();
  
        // Verify Update called instead of Insert
        expect(mockDatabase).toHaveBeenNthCalledWith(4, 'penalizaciones');
        expect(penaltyUpdateMock.update).toHaveBeenCalledWith(
          expect.objectContaining({
            dias_atraso: 9,
            monto_penalizacion: 9,
          })
        );
    });

    it('does not penalize if within grace period', async () => {
        // Setup dates
        const today = new Date('2024-02-06T12:00:00Z'); // 5 days after due date
        vi.setSystemTime(today);
        const dueDate = '2024-02-01'; // 5 days ago. 5 - 5 grace = 0 days late.
  
        // Mock DB calls
        // 1. Config
        mockDatabase.mockReturnValueOnce({
          first: vi.fn().mockResolvedValue({ tasa_mensual: 3, periodo_gracia_dias: 5 }),
        });
  
        // 2. Fetch Overdue (Logic usually filters this in SQL, but let's say one slipped through or SQL matches "vencido" but we re-check grace)
        // Note: The SQL query in service uses: where('fecha_vencimiento', '<', fechaLimiteStr);
        // fechaLimiteStr = today - grace.
        // If due = today - 5, and limit = today - 5. due < limit is FALSE.
        // So SQL shouldn't return it.
        // But if we simulate it returning (maybe partial match), the code checks:
        // const diasAtraso = diffDays - diasGracia;
        // if (diasAtraso <= 0) continue;
        
        const cuotasVencidas = [
          { id: 'cuota-grace', fecha_vencimiento: dueDate, monto_cuota: 1000, estatus: 'pendiente' },
        ];
        mockDatabase.mockReturnValueOnce({
          whereIn: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(cuotasVencidas),
        });
  
        // No further DB calls expected for this cuota
  
        await service.calcularPenalizacionesVencidas();
  
        // Expect NO insert/update for penalty
        // Calls: 1 (Config), 2 (Fetch Overdue). That's it.
        expect(mockDatabase).toHaveBeenCalledTimes(2);
    });

  it('handles errors gracefully for individual items', async () => {
    const today = new Date('2024-02-15T12:00:00Z');
    vi.setSystemTime(today);

    // 1. Config
    mockDatabase.mockReturnValueOnce({
      first: vi.fn().mockResolvedValue({ tasa_mensual: 3, periodo_gracia_dias: 5 }),
    });

    // 2. Fetch Overdue - 2 items
    const cuotasVencidas = [
      { id: 'cuota-error', fecha_vencimiento: '2024-01-01', monto_cuota: 1000 }, // Will fail DB call
      { id: 'cuota-ok', fecha_vencimiento: '2024-01-01', monto_cuota: 1000 }, // Will succeed
    ];
    mockDatabase.mockReturnValueOnce({
      whereIn: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(cuotasVencidas),
    });

    // 3. Process 'cuota-error' -> Fail on Check Existing
    mockDatabase.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockRejectedValue(new Error('DB Connection Error')),
    });

    // 4. Process 'cuota-ok' -> Succeed
    // Check Existing
    mockDatabase.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    });
    // Insert
    const insertMock = { insert: vi.fn().mockResolvedValue(true) };
    mockDatabase.mockReturnValueOnce(insertMock);
    // Update Amortization
    mockDatabase.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue(true),
    });

    await service.calcularPenalizacionesVencidas();

    // Verify that cuota-ok was processed despite cuota-error failure
    expect(insertMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ amortizacion_id: 'cuota-ok' })
    );
  });

  it('uses default configuration values if config table is empty', async () => {
    const today = new Date('2024-02-15T12:00:00Z');
    vi.setSystemTime(today);

    // 1. Config (Empty)
    mockDatabase.mockReturnValueOnce({
      first: vi.fn().mockResolvedValue(undefined), // No config found
    });

    // Default Tasa: 1.5% -> Daily: 1.5 / 30 / 100 = 0.0005
    // Default Grace: 5 days

    // 2. Fetch Overdue
    // Due date: 2024-02-01 (14 days ago). 14 - 5 grace = 9 days late.
    const cuotasVencidas = [
      { id: 'cuota-default', fecha_vencimiento: '2024-02-01', monto_cuota: 1000, estatus: 'pendiente' },
    ];
    mockDatabase.mockReturnValueOnce({
      whereIn: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(cuotasVencidas),
    });

    // 3. Check Existing Penalty -> None
    mockDatabase.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    });

    // 4. Insert Penalty
    const insertMock = { insert: vi.fn().mockResolvedValue(true) };
    mockDatabase.mockReturnValueOnce(insertMock);

    // 5. Update Amortization
    mockDatabase.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue(true),
    });

    await service.calcularPenalizacionesVencidas();

    // Verify Default Calculation
    // Penalty = 1000 * 0.0005 * 9 = 4.5
    expect(insertMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        monto_penalizacion: 4.5,
        tasa_interes: 1.5, // Default monthly rate
      })
    );
  });
});
});

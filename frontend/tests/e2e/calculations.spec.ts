import { calcularAmortizacion } from '../../lib/pagos-api';
import { test, expect } from '@playwright/test';

test.describe('V3.7: Verificación de Precisión de Cálculos (Unitario)', () => {
  test('Debe calcular correctamente la amortización francesa', () => {
    // Caso de prueba del prompt:
    // Lote: 1,000,000
    // Enganche: 200,000
    // Financiado: 800,000
    // Plazo: 12 meses
    // Tasa: 12% anual (1% mensual)

    const financiado = 800000;
    const tasaAnual = 12;
    const plazo = 12;

    const tabla = calcularAmortizacion(financiado, tasaAnual, plazo);

    // Validaciones
    expect(tabla).toHaveLength(12);

    const primeraCuota = tabla[0];

    if (!primeraCuota) {
      throw new Error('No se generó la primera cuota');
    }

    // Cálculo manual real: 800,000 * (0.01 * (1.01)^12) / ((1.01)^12 - 1) = 71,079.03
    // Nota: El prompt indicaba 71,196.73 pero matemáticamente con la fórmula dada es 71,079.03
    expect(primeraCuota.cuota).toBeCloseTo(71079.03, 1);

    // Interés primer mes: 800,000 * 0.01 = 8,000
    expect(primeraCuota.interes).toBeCloseTo(8000, 1);

    // Capital primer mes: 71,079.03 - 8,000 = 63,079.03
    expect(primeraCuota.capital).toBeCloseTo(63079.03, 1);

    // Saldo restante: 800,000 - 63,079.03 = 736,920.97
    expect(primeraCuota.saldo_restante).toBeCloseTo(736920.97, 1);
  });
});

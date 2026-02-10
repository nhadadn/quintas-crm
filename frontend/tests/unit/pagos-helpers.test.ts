import { describe, it, expect } from 'vitest';
import { agregarPagosDeVentas } from '../../lib/pagos-helpers';
import { VentaPerfil } from '../../lib/perfil-api';

describe('agregarPagosDeVentas', () => {
  it('should return empty array when ventas is null', () => {
    const result = agregarPagosDeVentas(null);
    expect(result).toEqual([]);
  });

  it('should return empty array when ventas is undefined', () => {
    const result = agregarPagosDeVentas(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when ventas is empty array', () => {
    const result = agregarPagosDeVentas([]);
    expect(result).toEqual([]);
  });

  it('should handle venta with null pagos', () => {
    const ventasMock: any[] = [
      {
        id: 1,
        pagos: null,
        lote_id: { numero_lote: '10', manzana: 'A' },
      },
    ];
    const result = agregarPagosDeVentas(ventasMock);
    expect(result).toEqual([]);
  });

  it('should process valid pagos and generate concept when missing', () => {
    const ventasMock: VentaPerfil[] = [
      {
        id: 1,
        lote_id: { numero_lote: '10', manzana: 'A' },
        fecha_venta: '2023-01-01',
        monto_total: 100000,
        estatus: 'activo',
        pagos: [
          {
            id: 101,
            fecha_pago: '2023-02-01',
            monto: 5000,
            estatus: 'pagado',
            numero_parcialidad: 1,
            // concepto missing
          },
          {
            id: 102,
            fecha_pago: '2023-03-01',
            monto: 5000,
            estatus: 'pagado',
            // numero_parcialidad missing, concepto missing
          },
        ],
      },
    ];

    const result = agregarPagosDeVentas(ventasMock);

    expect(result).toHaveLength(2);

    // Check first payment (with parcialidad)
    expect(result[0].concepto).toBe('Parcialidad 1 - Lote 10');

    // Check second payment (without parcialidad)
    expect(result[1].concepto).toBe('Pago a Capital - Lote 10');
  });

  it('should preserve existing concept if provided', () => {
    const ventasMock: VentaPerfil[] = [
      {
        id: 1,
        lote_id: { numero_lote: '10', manzana: 'A' },
        fecha_venta: '2023-01-01',
        monto_total: 100000,
        estatus: 'activo',
        pagos: [
          {
            id: 101,
            fecha_pago: '2023-02-01',
            monto: 5000,
            estatus: 'pagado',
            concepto: 'Pago Especial',
          },
        ],
      },
    ];

    const result = agregarPagosDeVentas(ventasMock);
    expect(result[0].concepto).toBe('Pago Especial');
  });

  it('should handle missing lote_id gracefully', () => {
    const ventasMock: any[] = [
      {
        id: 1,
        lote_id: null, // Missing lote info
        pagos: [
          {
            id: 101,
            fecha_pago: '2023-02-01',
            monto: 5000,
            estatus: 'pagado',
            numero_parcialidad: 1,
          },
        ],
      },
    ];

    const result = agregarPagosDeVentas(ventasMock);
    expect(result[0].concepto).toBe('Parcialidad 1 - Lote N/A');
  });

  it('should aggregate payments from multiple sales', () => {
    const ventasMock: VentaPerfil[] = [
      {
        id: 1,
        lote_id: { numero_lote: '10', manzana: 'A' },
        fecha_venta: '2023-01-01',
        monto_total: 100000,
        estatus: 'activo',
        pagos: [{ id: 101, fecha_pago: '2023-02-01', monto: 5000, estatus: 'pagado' }],
      },
      {
        id: 2,
        lote_id: { numero_lote: '20', manzana: 'B' },
        fecha_venta: '2023-01-05',
        monto_total: 200000,
        estatus: 'activo',
        pagos: [{ id: 201, fecha_pago: '2023-02-05', monto: 8000, estatus: 'pagado' }],
      },
    ];

    const result = agregarPagosDeVentas(ventasMock);
    expect(result).toHaveLength(2);
    expect(result[0].monto).toBe(5000);
    expect(result[1].monto).toBe(8000);
  });
});

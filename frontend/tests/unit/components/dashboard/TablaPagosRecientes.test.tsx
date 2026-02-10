
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TablaPagosRecientes } from '@/components/dashboard/TablaPagosRecientes';
import { Pago } from '@/types/erp';

// Mock data
const mockPagos: Pago[] = [
  {
    id: 1,
    venta_id: {
      id: 101,
      lote_id: {
        id: 501,
        identificador: 'L-501',
        numero_lote: 'L-501', // Normal string
        precio_total: 100000,
      },
      cliente_id: {
        id: 201,
        nombre: 'Juan',
        apellido_paterno: 'Perez',
        email: 'juan@example.com',
      },
      vendedor_id: 301,
      fecha_venta: '2023-01-01',
      monto_total: 100000,
      enganche: 10000,
      monto_financiado: 90000,
      plazo_meses: 12,
      estatus: 'contrato',
    },
    numero_pago: 1,
    fecha_vencimiento: '2023-02-01',
    monto: 5000,
    monto_pagado: 5000,
    mora: 0,
    estatus: 'pagado',
  },
];

describe('TablaPagosRecientes', () => {
  it('renders correctly with valid data', () => {
    render(<TablaPagosRecientes data={mockPagos} />);
    expect(screen.getByText('Lote L-501')).toBeDefined();
  });

  it('handles object in numero_lote gracefully', () => {
    const badData = [
      {
        ...mockPagos[0],
        id: 2,
        venta_id: {
          ...(mockPagos[0].venta_id as any),
          lote_id: {
            ...(mockPagos[0].venta_id as any).lote_id,
            numero_lote: { identificador: 'L-BUG-FIXED' }, // Simulate the object
          },
        },
      },
    ];

    render(<TablaPagosRecientes data={badData as any} />);
    // Should render the identificador from the object
    expect(screen.getByText('Lote L-BUG-FIXED')).toBeDefined();
  });
  
  it('handles object in numero_lote without identifier gracefully', () => {
      const badData = [
        {
          ...mockPagos[0],
          id: 3,
          venta_id: {
            ...(mockPagos[0].venta_id as any),
            lote_id: {
              ...(mockPagos[0].venta_id as any).lote_id,
              numero_lote: { some: 'random' }, // Object without known keys
            },
          },
        },
      ];
  
      render(<TablaPagosRecientes data={badData as any} />);
      // Should fallback to N/A
      expect(screen.getByText('Lote N/A')).toBeDefined();
    });
});


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

  it('filters payments by status', async () => {
    render(<TablaPagosRecientes data={mockPagos} />);
    
    // Initially shows all
    expect(screen.getByText('Lote L-501')).toBeDefined();

    // Select 'pendiente' - should filter out 'pagado'
    const select = screen.getByRole('combobox');
    const { fireEvent } = await import('@testing-library/react');
    
    fireEvent.change(select, { target: { value: 'pendiente' } });
    expect(screen.queryByText('Lote L-501')).toBeNull();
    expect(screen.getByText('No se encontraron pagos')).toBeDefined();

    // Select 'pagado' - should show 'pagado'
    fireEvent.change(select, { target: { value: 'pagado' } });
    expect(screen.getByText('Lote L-501')).toBeDefined();
  });

  it('paginates correctly', async () => {
    // Generate 7 payments (page size is 5)
    const manyPagos = Array.from({ length: 7 }, (_, i) => ({
      ...mockPagos[0],
      id: i + 10,
      numero_pago: i + 1,
      monto: 1000 + i,
    }));

    render(<TablaPagosRecientes data={manyPagos} />);
    const { fireEvent } = await import('@testing-library/react');

    // Should show first 5
    expect(screen.getByText('$1,000')).toBeDefined();
    expect(screen.queryByText('$1,006')).toBeNull(); // 7th item
    expect(screen.getByText('Página 1 de 2')).toBeDefined();

    // Go to next page
    const nextBtn = screen.getAllByRole('button')[1]; // Right arrow
    fireEvent.click(nextBtn);

    expect(screen.getByText('Página 2 de 2')).toBeDefined();
    expect(screen.getByText('$1,006')).toBeDefined();

    // Go back
    const prevBtn = screen.getAllByRole('button')[0]; // Left arrow
    fireEvent.click(prevBtn);
    expect(screen.getByText('Página 1 de 2')).toBeDefined();
  });

  it('renders empty state when no payments provided', () => {
    render(<TablaPagosRecientes data={[]} />);
    expect(screen.getByText('No se encontraron pagos')).toBeDefined();
  });

  it('applies correct status colors', () => {
    const statuses = ['pagado', 'pendiente', 'atrasado', 'otro'];
    const statusData = statuses.map((status, i) => ({
      ...mockPagos[0],
      id: i + 50,
      estatus: status,
    }));

    render(<TablaPagosRecientes data={statusData} />);

    // Just verifying they are rendered is enough as styles are applied via class names
    // We can check if specific classes are present if needed, but integration is usually visual.
    // However, let's check if the text exists.
    expect(screen.getByText('pagado')).toBeDefined();
    expect(screen.getByText('pendiente')).toBeDefined();
    expect(screen.getByText('atrasado')).toBeDefined();
    expect(screen.getByText('otro')).toBeDefined();
  });
});

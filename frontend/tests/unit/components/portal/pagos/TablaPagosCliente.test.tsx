
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TablaPagosCliente } from '@/components/portal/pagos/TablaPagosCliente';
import { PagoPerfil, EstadisticasCliente } from '@/lib/perfil-api';

// Mock dependencies
vi.mock('@/components/portal/pagos/ModalPagoStripe', () => ({
  ModalPagoStripe: ({ isOpen, onClose, onSuccess }: any) => (
    isOpen ? (
      <div role="dialog">
        Modal Pago
        <button onClick={onClose}>Cerrar</button>
        <button onClick={onSuccess}>Pagar Exitoso</button>
      </div>
    ) : null
  ),
}));

// Mock fetch for download
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

const mockPagos: PagoPerfil[] = [
  {
    id: 1,
    venta_id: 101,
    fecha_pago: '2023-01-15',
    monto: 5000,
    estatus: 'pagado',
    concepto: 'Enganche',
    saldo_restante: 0,
    numero_parcialidad: undefined,
    numero_lote: 'L-01',
  },
  {
    id: 2,
    venta_id: 101,
    fecha_pago: '2023-02-15',
    monto: 2000,
    estatus: 'pagado',
    concepto: 'Mensualidad',
    saldo_restante: 0,
    numero_parcialidad: 1,
    numero_lote: 'L-01',
  },
  {
    id: 3,
    venta_id: 101,
    fecha_pago: '2023-03-15',
    monto: 2000,
    estatus: 'pendiente',
    concepto: 'Mensualidad',
    saldo_restante: 2000,
    numero_parcialidad: 2,
    numero_lote: 'L-01',
  },
];

const mockEstadisticas: EstadisticasCliente = {
  total_pagado: 7000,
  saldo_pendiente: 100000,
  total_compras: 107000,
  numero_ventas: 1,
  pagos_realizados: 2,
  proximo_pago: {
    fecha_pago: '2023-03-15',
    monto: 2000,
    estatus: 'pendiente',
  },
};

describe('TablaPagosCliente Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with payment data', () => {
    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    expect(screen.getByText('Total Pagado')).toBeDefined();
    expect(screen.getByText('$7,000.00')).toBeDefined();
    expect(screen.getByText('Saldo Pendiente')).toBeDefined();
    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 2').length).toBeGreaterThan(0);
  });

  it('filters payments by status', () => {
    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    // Initial state shows all
    expect(screen.getAllByText('Parcialidad 2').length).toBeGreaterThan(0);

    // Filter by 'pagado'
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pagado' } });

    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 1').length).toBeGreaterThan(0);
    
    // 'Parcialidad 2' might be in stats, so check it's NOT in the table rows
    const rows = screen.getAllByRole('row');
    const tableContent = rows.map(r => r.textContent).join(' ');
    expect(tableContent).not.toContain('Parcialidad 2');
  });

  it('searches payments by text', () => {
    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Enganche' } });

    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.queryByText('Parcialidad 1')).toBeNull();
  });

  it('sorts payments by column', () => {
    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    // Default sort is by date desc (newest first)
    // 2023-03-15 (Parcialidad 2) -> 2023-02-15 (Parcialidad 1) -> 2023-01-15 (Enganche)
    const rows = screen.getAllByRole('row');
    // Row 0 is header. Row 1 should be Parcialidad 2
    expect(rows[1].textContent).toContain('Parcialidad 2');

    // Click on Fecha header to toggle sort (asc)
    fireEvent.click(screen.getByText('Fecha'));
    
    const rowsAsc = screen.getAllByRole('row');
    // Row 1 should be Enganche (oldest)
    expect(rowsAsc[1].textContent).toContain('Enganche');
  });

  it('opens payment modal when "Pagar" is clicked', () => {
    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    // Find the "Pagar" button for the pending payment
    const payButtons = screen.getAllByTitle('Pagar ahora');
    fireEvent.click(payButtons[0]);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Modal Pago')).toBeDefined();
  });

  it('handles download receipt', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['pdf content'], { type: 'application/pdf' }),
    });

    render(
      <TablaPagosCliente 
        pagos={mockPagos} 
        estadisticas={mockEstadisticas} 
        clienteId={123} 
      />
    );

    const downloadButtons = screen.getAllByTitle('Descargar Recibo');
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      // First row is the newest payment (id: 3) due to default descending sort
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/reportes/recibo-pago?id=3'));
    });
  });
});

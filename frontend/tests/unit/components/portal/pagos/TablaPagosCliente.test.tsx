import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TablaPagosCliente } from '@/components/portal/pagos/TablaPagosCliente';
import { PagoPerfil, EstadisticasCliente } from '@/lib/perfil-api';

// Mock dependencies
vi.mock('@/components/portal/pagos/ModalPagoStripe', () => ({
  ModalPagoStripe: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div role="dialog">
        Modal Pago
        <button onClick={onClose}>Cerrar</button>
        <button onClick={onSuccess}>Pagar Exitoso</button>
      </div>
    ) : null,
}));

vi.mock('@/components/portal/pagos/ModalSolicitarReembolso', () => ({
  ModalSolicitarReembolso: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div role="dialog" aria-label="Modal Reembolso">
        Modal Reembolso
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null,
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
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    expect(screen.getByText('Total Pagado')).toBeDefined();
    expect(screen.getByText('$7,000.00')).toBeDefined();
    expect(screen.getByText('Saldo Pendiente')).toBeDefined();
    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 2').length).toBeGreaterThan(0);
  });

  it('filters payments by status', () => {
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    // Initial state shows all
    expect(screen.getAllByText('Parcialidad 2').length).toBeGreaterThan(0);

    // Filter by 'pagado'
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pagado' } });

    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parcialidad 1').length).toBeGreaterThan(0);

    // 'Parcialidad 2' might be in stats, so check it's NOT in the table rows
    const rows = screen.getAllByRole('row');
    const tableContent = rows.map((r) => r.textContent).join(' ');
    expect(tableContent).not.toContain('Parcialidad 2');
  });

  it('searches payments by text', () => {
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Enganche' } });

    expect(screen.getAllByText('Enganche').length).toBeGreaterThan(0);
    expect(screen.queryByText('Parcialidad 1')).toBeNull();
  });

  it('sorts payments by column', () => {
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

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
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    // Find the "Pagar" button for the pending payment
    const payButtons = screen.getAllByTitle('Pagar ahora');
    fireEvent.click(payButtons[0]);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Modal Pago')).toBeDefined();

    // Test Success callback
    // Mock window.location.reload
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: vi.fn() },
    });

    fireEvent.click(screen.getByText('Pagar Exitoso'));
    expect(window.location.reload).toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders correct color for vencido status', () => {
    const vencidoPago = { ...mockPagos[0], id: 99, estatus: 'vencido', concepto: 'Vencido Item' };
    render(
      <TablaPagosCliente pagos={[vencidoPago]} estadisticas={mockEstadisticas} clienteId={123} />,
    );

    const statusBadges = screen.getAllByText('VENCIDO');
    expect(statusBadges[0].className).toContain('text-danger');
  });

  it('handles download receipt failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    // Mock console.error to avoid polluting output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    const downloadButtons = screen.getAllByTitle('Descargar Recibo');
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('filters by date range', () => {
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    // Filter from Feb 1 to Feb 28
    const startDateInput = screen.getByPlaceholderText('Desde');
    const endDateInput = screen.getByPlaceholderText('Hasta');

    fireEvent.change(startDateInput, { target: { value: '2023-02-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-02-28' } });

    // Should only show payment from Feb 15
    expect(screen.getAllByText('Parcialidad 1').length).toBeGreaterThan(0);
    expect(screen.queryByText('Enganche')).toBeNull(); // Jan 15
    expect(screen.queryByText('Parcialidad 2')).toBeNull(); // Mar 15
  });

  it('handles pagination', () => {
    // Create 15 items
    const manyPagos = Array.from({ length: 15 }, (_, i) => ({
      ...mockPagos[0],
      id: i + 1,
      concepto: `Pago ${i + 1}`,
      fecha_pago: '2023-01-01',
    }));

    render(<TablaPagosCliente pagos={manyPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    // Default shows 10 items
    expect(screen.getAllByRole('row').length).toBe(11); // 10 data + 1 header

    // Click next page
    const nextButton = screen.getByLabelText('Siguiente página');
    fireEvent.click(nextButton);

    // Should show remaining 5 items
    expect(screen.getAllByRole('row').length).toBe(6); // 5 data + 1 header
  });

  it('sorts payments by different columns', () => {
    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    // Sort by Monto
    fireEvent.click(screen.getByText('Monto'));
    let rows = screen.getAllByRole('row');
    // Descending by default: 5000 (Enganche) -> 2000 (Parcialidad 1) -> 2000 (Parcialidad 2)
    // Enganche is row 1
    expect(rows[1].textContent).toContain('Enganche');

    // Toggle Ascending
    fireEvent.click(screen.getByText('Monto'));
    rows = screen.getAllByRole('row');
    // Ascending: 2000 (Parcialidad 1 or 2) -> 5000 (Enganche)
    // Enganche should be last
    expect(rows[rows.length - 1].textContent).toContain('Enganche');

    // Sort by Estatus
    fireEvent.click(screen.getByText('Estatus'));
    rows = screen.getAllByRole('row');
    // Descending: pendiente > pagado (alphabetically? or logic?)
    // "pendiente" > "pagado" is true.
    // So Parcialidad 2 (pendiente) should be first.
    expect(rows[1].textContent).toContain('Parcialidad 2');
  });

  it('handles download receipt success', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['pdf content'], { type: 'application/pdf' }),
    });

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();

    render(<TablaPagosCliente pagos={mockPagos} estadisticas={mockEstadisticas} clienteId={123} />);

    const downloadButtons = screen.getAllByTitle('Descargar Recibo');
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});

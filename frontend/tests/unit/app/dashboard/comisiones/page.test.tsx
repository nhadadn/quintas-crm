import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardComisionesPage from '@/app/dashboard/comisiones/page';
import { auth } from '@/lib/auth';
import { fetchComisionesByVendedor } from '@/lib/comisiones-api';
import { getVendedorById } from '@/lib/vendedores-api';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/comisiones-api', () => ({
  fetchComisionesByVendedor: vi.fn(),
}));

vi.mock('@/lib/vendedores-api', () => ({
  getVendedorById: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/components/ui/InfoTooltip', () => ({
  InfoTooltip: ({ content }: any) => <span data-testid="info-tooltip">{content}</span>,
}));

describe('DashboardComisionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el dashboard de comisiones del vendedor autenticado', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Vendedor Demo', vendedorId: 'v-1', role: 'Vendedor' },
      accessToken: 'fake-token',
    });

    (getVendedorById as any).mockResolvedValue({
      id: 'v-1',
      nombre: 'Vendedor',
      apellido_paterno: 'Demo',
      email: 'demo@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
    });

    (fetchComisionesByVendedor as any).mockResolvedValue([
      {
        id: 'c-1',
        vendedor_id: 'v-1',
        monto_comision: 1500,
        estatus: 'pendiente',
        fecha_pago_programada: '2024-02-01',
        venta_id: {
          id: 'venta-1',
          lote_id: { numero_lote: 'L12', manzana: 'A' },
          cliente_id: { nombre: 'Juan', apellido_paterno: 'Pérez', apellido_materno: 'López' },
        },
      },
    ]);

    const jsx = await DashboardComisionesPage();
    render(jsx);

    expect(screen.getByText('Mis Comisiones')).toBeDefined();
    expect(screen.getByText('Vendedor Demo')).toBeDefined();
    expect(screen.getByText('Comisiones Pendientes')).toBeDefined();
    expect(screen.getByText('Comisiones Pagadas')).toBeDefined();
    expect(screen.getByText('Total Generado')).toBeDefined();
    expect(screen.getByText('L12 · Mz. A')).toBeDefined();
    expect(screen.getByText('Juan Pérez López')).toBeDefined();
    expect(screen.getByTestId('info-tooltip')).toBeDefined();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortalClientePage from '@/app/portal/(dashboard)/page';
import { auth } from '@/lib/auth';
import { getPerfilCliente } from '@/lib/perfil-api';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/perfil-api', () => ({
  getPerfilCliente: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/components/dashboard/StatsCard', () => ({
  StatsCard: ({ title }: any) => <div data-testid="stats-card">{title}</div>,
}));

vi.mock('@/components/gestion/TablaAmortizacion', () => ({
  default: () => <div data-testid="tabla-amortizacion">TablaAmortizacion</div>,
}));

describe('Portal Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders portal dashboard with user data', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Test User', role: 'Cliente' },
      accessToken: 'fake-token',
    });

    (getPerfilCliente as any).mockResolvedValue({
      perfil: {
        nombre: 'Test User',
        email: 'test@example.com',
        ventas: [
          {
            id: 1,
            lote_id: { numero_lote: 'L1', manzana: 'M1' },
            estatus: 'active',
            pagos: [
              { numero_parcialidad: 1, fecha_pago: '2023-01-01', monto: 1000, estatus: 'pagado' },
            ],
          },
        ],
      },
      estadisticas: {
        total_pagado: 1000,
        saldo_pendiente: 5000,
        pagos_realizados: 5,
        total_compras: 6000,
      },
    });

    const jsx = await PortalClientePage();
    render(jsx);

    expect(screen.getByText('Bienvenido Test User a tu perfil')).toBeDefined();
    expect(screen.getAllByTestId('stats-card')).toHaveLength(4);
    expect(screen.getByTestId('tabla-amortizacion')).toBeDefined();
  });

  it('redirects if not authenticated', async () => {
    (auth as any).mockResolvedValue(null);
    const { redirect } = await import('next/navigation');

    try {
      await PortalClientePage();
    } catch (e) {
      // redirect throws usually
    }

    expect(redirect).toHaveBeenCalledWith('/portal/auth/login');
  });

  it('shows info screen for non-Cliente roles', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Admin User', role: 'Administrator' },
      accessToken: 'fake-token',
    });

    const jsx = await PortalClientePage();
    render(jsx);

    expect(screen.getByText('Vista de Portal (Administrator)')).toBeDefined();
    expect(screen.getByText('Ir al Dashboard Administrativo')).toBeDefined();
  });

  it('shows error message if profile fetch fails', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Test User', role: 'Cliente' },
      accessToken: 'fake-token',
    });

    (getPerfilCliente as any).mockRejectedValue(new Error('API Error'));

    const jsx = await PortalClientePage();
    render(jsx);

    expect(screen.getByText('Error al cargar perfil')).toBeDefined();
    expect(screen.getByText('API Error')).toBeDefined();
  });

  it('renders correctly with no sales', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'New User', role: 'Cliente' },
      accessToken: 'fake-token',
    });

    (getPerfilCliente as any).mockResolvedValue({
      perfil: {
        nombre: 'New User',
        ventas: [],
      },
      estadisticas: {
        total_pagado: 0,
        saldo_pendiente: 0,
        pagos_realizados: 0,
        total_compras: 0,
      },
    });

    const jsx = await PortalClientePage();
    render(jsx);

    expect(screen.getByText('Bienvenido New User a tu perfil')).toBeDefined();
    expect(screen.getByText('No hay información de pagos disponible.')).toBeDefined();
  });
});

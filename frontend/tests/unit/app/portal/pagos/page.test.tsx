
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Assuming the path exists, if not I might need to check
// c:\Users\nadir\quintas-crm\frontend\app\portal\(dashboard)\pagos\page.tsx
import PagosPage from '@/app/portal/(dashboard)/pagos/page';
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

vi.mock('@/components/portal/pagos/TablaPagosCliente', () => ({
  TablaPagosCliente: () => <div data-testid="tabla-pagos">TablaPagosCliente</div>,
}));

describe('Portal Pagos Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects if not authenticated', async () => {
    (auth as any).mockResolvedValue(null);
    const { redirect } = await import('next/navigation');
    
    try {
      await PagosPage();
    } catch (e) {}
    
    expect(redirect).toHaveBeenCalledWith('/portal/auth/login');
  });

  it('shows info screen for admin roles', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Admin', role: 'Administrator' },
      accessToken: 'token',
    });

    const jsx = await PagosPage();
    render(jsx);
    
    expect(screen.getByText('Vista de Pagos (Administrator)')).toBeDefined();
    expect(screen.getByText('Ir al Dashboard de Pagos')).toBeDefined();
  });

  it('shows error when profile fetch fails', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'User', role: 'Cliente' },
      accessToken: 'token',
    });
    
    (getPerfilCliente as any).mockRejectedValue(new Error('Fail'));
    
    const jsx = await PagosPage();
    render(jsx);
    
    expect(screen.getByText('Error al cargar pagos')).toBeDefined();
  });

  it('renders payments page with table on success', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Test User', role: 'Cliente' },
      accessToken: 'fake-token',
    });

    (getPerfilCliente as any).mockResolvedValue({
      perfil: {
        id: 1,
        ventas: [{ id: 1, pagos: [] }],
      },
      estadisticas: {},
    });

    const jsx = await PagosPage();
    render(jsx);

    expect(screen.getByText('Historial de Pagos')).toBeDefined();
    expect(screen.getByTestId('tabla-pagos')).toBeDefined();
  });
});

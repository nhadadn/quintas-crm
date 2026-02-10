
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

  it('renders payments page with table', async () => {
    (auth as any).mockResolvedValue({
      user: { name: 'Test User' },
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

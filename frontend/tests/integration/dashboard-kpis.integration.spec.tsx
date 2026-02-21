import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
vi.mock('next-auth/react', async (importOriginal) => {
  const mod: any = await importOriginal();
  return {
    ...mod,
    useSession: () => ({
      data: { user: { id: 'u1' }, accessToken: 'tok' },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: any) => children,
  };
});
import { SessionProvider } from 'next-auth/react';
import DashboardVentasPage from '@/app/dashboard/ventas/page';
import { server, http, HttpResponse } from '../setup/msw';

function renderWithSession(ui: React.ReactElement) {
  const session: any = { user: { id: 'u1', email: 'test@example.com' }, accessToken: 'tok' };
  return render(<SessionProvider session={session}>{ui}</SessionProvider>);
}

describe('Dashboard Ventas → KPIs & Chart gating', () => {
  test('renders skeleton when KPIs fail and mounts chart only when container has size', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 0 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 0 });
    server.use(
      http.get('/api/dashboard/kpis', () =>
        HttpResponse.json(
          { statusCode: 403, message: 'Forbidden', timestamp: new Date().toISOString() },
          { status: 403 },
        ),
      ),
      http.get('/api/dashboard/ventas-por-mes', () => HttpResponse.json({ data: [] })),
      http.get('/api/dashboard/ventas-recientes', () => HttpResponse.json({ data: [] })),
    );

    renderWithSession(<DashboardVentasPage />);

    await waitFor(() => {
      expect(screen.getByText(/Dashboard de Ventas/i)).toBeInTheDocument();
    });

    const placeholder = await screen.findByText(/Cargando gráfico…/i);
    expect(placeholder).toBeInTheDocument();
  });

  test('renders chart after success and size available', async () => {
    server.use(
      http.get('/api/dashboard/kpis', () =>
        HttpResponse.json({
          data: {
            total_ventas: 100,
            total_pagado: 50,
            total_pendiente: 50,
            ventas_mes_actual: 80,
            crecimiento_mes_anterior: 10,
            lotes_vendidos_mes: 2,
            comisiones_pendientes: 0,
          },
        }),
      ),
      http.get('/api/dashboard/ventas-por-mes', () =>
        HttpResponse.json({ data: [{ mes: '2026-01', total_ventas: 100, cantidad_ventas: 1 }] }),
      ),
      http.get('/api/dashboard/ventas-recientes', () => HttpResponse.json({ data: [] })),
    );

    // Mock element size
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 400,
    });

    renderWithSession(<DashboardVentasPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ventas Totales/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const placeholder = screen.queryByText(/Cargando gráfico…/i);
      expect(placeholder).toBeNull();
    });
  });
});

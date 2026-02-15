import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import DashboardComisionesPage from '@/app/dashboard/comisiones/page';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSession } from 'next-auth/react';
import * as dashboardApi from '@/lib/dashboard-api';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('@/lib/dashboard-api');
vi.mock('@/components/dashboard/KPICard', () => ({
  KPICard: ({ title, value }: any) => (
    <div data-testid="kpi-card">
      {title}: {value}
    </div>
  ),
}));

// Mock Lazy component
vi.mock('@/components/dashboard/TablaRankingVendedores', () => ({
  TablaRankingVendedores: () => <div data-testid="tabla-ranking">Tabla Ranking</div>,
}));

describe('DashboardComisionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      data: { accessToken: 'fake-token', user: { name: 'Test User' } },
      status: 'authenticated',
    });
  });

  it('renders and handles data with undefined values safely', async () => {
    // Mock API responses with undefined numeric values to test the fix
    (dashboardApi.fetchKPIs as any).mockResolvedValue({
      comisiones_pendientes: 1000,
    });

    (dashboardApi.fetchComisionesPorVendedor as any).mockResolvedValue([
      {
        vendedor_id: 1,
        vendedor: 'Vendedor 1',
        cantidad_ventas: 5,
        total_vendido: undefined, // This caused the crash
        total_comisiones: undefined, // This caused the crash
      },
    ]);

    await act(async () => {
      render(<DashboardComisionesPage />);
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Vendedor 1')).toBeInTheDocument();
    });

    // Verify it rendered without crashing and shows 0 or handled value
    // Since we use toLocaleString on (undefined || 0), it should display $0.00 (depending on locale formatting)
    // We check that it didn't crash.
    expect(screen.getByText('Vendedor 1')).toBeInTheDocument();
  });
});

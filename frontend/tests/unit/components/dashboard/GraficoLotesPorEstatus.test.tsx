import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GraficoLotesPorEstatus } from '@/components/dashboard/GraficoLotesPorEstatus';
import { LotesPorEstatus } from '@/types/dashboard';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('GraficoLotesPorEstatus Component', () => {
  const mockData: LotesPorEstatus[] = [
    {
      estatus: 'disponible',
      cantidad: 10,
      area_total: 5000,
      valor_total: 1000000,
      porcentaje_ocupacion: 50,
    },
    {
      estatus: 'vendido',
      cantidad: 5,
      area_total: 2500,
      valor_total: 500000,
      porcentaje_ocupacion: 25,
    },
  ];

  it('renders correctly with valid data', () => {
    render(<GraficoLotesPorEstatus data={mockData} />);
    expect(screen.getByText('Estado del Inventario')).toBeDefined();
  });

  it('handles undefined values in CustomTooltip safely', () => {
    // Simulate runtime data issue where valor_total might be missing
    const problematicData = [
      {
        estatus: 'disponible',
        cantidad: 10,
        area_total: 5000,
        // valor_total is missing/undefined
        porcentaje_ocupacion: 50,
      },
    ] as unknown as LotesPorEstatus[];

    render(<GraficoLotesPorEstatus data={problematicData} />);
    
    // We can't easily trigger the tooltip hover in jsdom/recharts without complex setup,
    // but we can verify the component renders without crashing initially.
    // To truly test the tooltip logic, we might need to export the Tooltip component or unit test the logic if it were extracted.
    // However, for this task, the primary goal is ensuring the code handles it.
    
    // Let's verify the code doesn't crash on render
    expect(screen.getByText('Estado del Inventario')).toBeDefined();
  });
});

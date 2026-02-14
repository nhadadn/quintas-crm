import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GraficoLotesPorEstatus } from '@/components/dashboard/GraficoLotesPorEstatus';
import { LotesPorEstatus } from '@/types/dashboard';

// Hoisted variables to control mock behavior
const mocks = vi.hoisted(() => ({
  tooltipActive: true,
  tooltipPayload: [
    { 
      payload: { 
        estatus: 'disponible', 
        cantidad: 10, 
        area_total: 5000, 
        valor_total: 1000000, 
        porcentaje_ocupacion: 50 
      } 
    }
  ] as any[]
}));

// Mock Recharts to allow testing the Tooltip content
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    // Mock Tooltip to render its content immediately with test data
    Tooltip: ({ content }: any) => {
      if (React.isValidElement(content)) {
        // Inject props that Recharts would normally inject
        return React.cloneElement(content as React.ReactElement, { 
          active: mocks.tooltipActive,
          payload: mocks.tooltipPayload,
          label: 'disponible'
        });
      }
      return null;
    },
    // Mock other components to render children or nothing
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Cell: () => null,
  };
});

describe('GraficoLotesPorEstatus Component', () => {
  const mockData: LotesPorEstatus[] = [
    {
      estatus: 'disponible',
      cantidad: 10,
      area_total: 5000,
      valor_total: 1000000,
      porcentaje_ocupacion: 50,
    },
  ];

  it('renders correctly', () => {
    mocks.tooltipActive = true;
    render(<GraficoLotesPorEstatus data={mockData} />);
    expect(screen.getByText('Estado del Inventario')).toBeDefined();
  });

  it('renders tooltip content via mock', () => {
    mocks.tooltipActive = true;
    render(<GraficoLotesPorEstatus data={mockData} />);
    // Check for tooltip content which should be rendered by our mock
    expect(screen.getByText('disponible')).toBeDefined();
    expect(screen.getByText('10 lotes')).toBeDefined();
    expect(screen.getByText('Valor: $1,000,000')).toBeDefined();
    expect(screen.getByText('Área: 5,000 m²')).toBeDefined();
    expect(screen.getByText('50% del total')).toBeDefined();
  });

  it('does not render tooltip when inactive', () => {
    mocks.tooltipActive = false;
    render(<GraficoLotesPorEstatus data={mockData} />);
    expect(screen.queryByText('disponible')).toBeNull();
  });
  
  it('does not render tooltip when payload data is missing', () => {
    mocks.tooltipActive = true;
    mocks.tooltipPayload = [{ payload: null }];
    render(<GraficoLotesPorEstatus data={mockData} />);
    expect(screen.queryByText('disponible')).toBeNull();
  });

  it('renders tooltip with default values when data is missing', () => {
    mocks.tooltipActive = true;
    mocks.tooltipPayload = [{
      payload: {
        estatus: null,
        cantidad: 10,
        area_total: null,
        valor_total: null,
        porcentaje_ocupacion: 50
      }
    }];
    render(<GraficoLotesPorEstatus data={mockData} />);
    expect(screen.getByText('Desconocido')).toBeDefined();
    expect(screen.getByText('Valor: $0')).toBeDefined();
    expect(screen.getByText('Área: 0 m²')).toBeDefined();
  });

  it('renders with fallback color for unknown status', () => {
    const unknownData = [{ ...mockData[0], estatus: 'unknown_status' }];
    render(<GraficoLotesPorEstatus data={unknownData} />);
    expect(screen.getByText('Estado del Inventario')).toBeDefined();
  });
});

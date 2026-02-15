import React from 'react';
import { render, screen } from '@testing-library/react';
import { GraficoPagosPorEstatus } from '@/components/dashboard/GraficoPagosPorEstatus';
import { PagosPorEstatus } from '@/types/dashboard';
import { vi, describe, it, expect } from 'vitest';

// Hoisted variables to control mock behavior
const mocks = vi.hoisted(() => ({
  tooltipActive: true,
  tooltipPayload: [
    {
      payload: {
        name: 'Pagado',
        value: 10,
        monto_total: 1000,
      },
    },
  ] as any[],
}));

// Mock recharts to avoid rendering issues in JSDOM and test internal components
vi.mock('recharts', async (importOriginal) => {
  const OriginalModule = await importOriginal<typeof import('recharts')>();
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    // Mock Tooltip to render content
    Tooltip: ({ content }: any) => {
      if (React.isValidElement(content)) {
        return React.cloneElement(content as React.ReactElement, {
          active: mocks.tooltipActive,
          payload: mocks.tooltipPayload,
        });
      }
      return null;
    },
    // Mock Legend to render content
    Legend: ({ content }: any) => {
      if (typeof content === 'function') {
        return content({
          payload: [
            { value: 'Pagado', color: '#22c55e' },
            { value: 'Pendiente', color: '#eab308' },
          ],
        });
      }
      return null;
    },
  };
});

describe('GraficoPagosPorEstatus', () => {
  const mockData: PagosPorEstatus[] = [
    { estatus: 'pagado', cantidad: 10, monto_total: 1000, porcentaje_puntuales: 100 },
    { estatus: 'pendiente', cantidad: 5, monto_total: 500, porcentaje_puntuales: 0 },
  ];

  it('renders correctly with valid data', () => {
    mocks.tooltipActive = true;
    render(<GraficoPagosPorEstatus data={mockData} />);
    expect(screen.getByText('Estatus de Pagos')).toBeInTheDocument();

    // Check center text (total)
    expect(screen.getByText('15')).toBeInTheDocument(); // 10 + 5
  });

  it('renders tooltip content via mock', () => {
    mocks.tooltipActive = true;
    render(<GraficoPagosPorEstatus data={mockData} />);
    // "Pagado" appears in Tooltip and Legend. We check at least one instance exists.
    expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0);
    expect(screen.getByText('10 pagos')).toBeInTheDocument(); // Tooltip value
    expect(screen.getByText('Monto: $1,000')).toBeInTheDocument(); // Tooltip extra info
  });

  it('does not render tooltip when inactive', () => {
    mocks.tooltipActive = false;
    render(<GraficoPagosPorEstatus data={mockData} />);
    // Tooltip content should not be present (except if Legend has same text, but specific tooltip text won't be there)
    expect(screen.queryByText('10 pagos')).toBeNull();
  });

  it('renders tooltip with default values when data is missing', () => {
    mocks.tooltipActive = true;
    mocks.tooltipPayload = [
      {
        payload: {
          name: 'Pagado',
          value: 10,
          monto_total: null,
        },
      },
    ];
    render(<GraficoPagosPorEstatus data={mockData} />);
    expect(screen.getByText('Monto: $0')).toBeInTheDocument();
  });

  it('renders legend content via mock', () => {
    render(<GraficoPagosPorEstatus data={mockData} />);
    expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0); // In Legend and Tooltip
    expect(screen.getByText('Pendiente')).toBeInTheDocument(); // In Legend
  });

  it('renders correctly with missing monto_total (simulated)', () => {
    // Simulate runtime data issue by casting
    const mockData: any[] = [
      { estatus: 'pagado', cantidad: 10, monto_total: undefined, porcentaje_puntuales: 100 },
    ];

    expect(() => render(<GraficoPagosPorEstatus data={mockData} />)).not.toThrow();
  });

  it('renders with fallback color/label for unknown status', () => {
    const unknownData: any[] = [
      { estatus: 'unknown_status', cantidad: 10, monto_total: 100, porcentaje_puntuales: 0 },
    ];
    render(<GraficoPagosPorEstatus data={unknownData} />);
    // Check if it renders without crashing (fallback color logic is internal to Pie/Cell which we mock)
    // But we can check if the data processed uses the fallback label (original status)
    // In component: name: LABELS[item.estatus] || item.estatus
    // The Legend mock is hardcoded in this file, so we can't check the Legend output for this unless we mock Legend dynamically too.
    // However, the main render should succeed.
    expect(screen.getByText('Estatus de Pagos')).toBeInTheDocument();
  });
});

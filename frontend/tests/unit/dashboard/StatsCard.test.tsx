import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';

describe('StatsCard Component', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Ventas Totales" value="$50,000" />);

    expect(screen.getByText('Ventas Totales')).toBeDefined();
    expect(screen.getByText('$50,000')).toBeDefined();
  });

  it('renders change with positive color', () => {
    render(
      <StatsCard
        title="Ingresos"
        value="$10,000"
        change="+15%"
        changeType="positive"
        changeLabel="vs mes anterior"
      />,
    );

    const changeElement = screen.getByText('+15%');
    expect(changeElement).toBeDefined();
    expect(changeElement.className).toContain('text-emerald-500');
    expect(screen.getByText('vs mes anterior')).toBeDefined();
  });

  it('renders change with negative color', () => {
    render(<StatsCard title="Gastos" value="$5,000" change="-5%" changeType="negative" />);

    const changeElement = screen.getByText('-5%');
    expect(changeElement).toBeDefined();
    expect(changeElement.className).toContain('text-red-500');
  });

  it('renders icon when provided', () => {
    const TestIcon = <span data-testid="test-icon">Icon</span>;
    render(<StatsCard title="Icon Test" value="0" icon={TestIcon} />);

    expect(screen.getByTestId('test-icon')).toBeDefined();
  });
});

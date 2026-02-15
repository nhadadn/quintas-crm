import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DetallePagoPage from '@/app/pagos/[id]/page';
import * as pagosApi from '@/lib/pagos-api';
import { useSession } from 'next-auth/react';
import React from 'react';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('@/lib/pagos-api');
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock GeneradorRecibos component
vi.mock('@/components/pagos/GeneradorRecibos', () => ({
  default: () => <div data-testid="generador-recibos">Generador Recibos</div>,
}));

// Mock React.use for Next.js 15 params unwrapping
// We need to ensure React.use exists or mock it if running in an env where it doesn't
if (!React.use) {
  // @ts-ignore
  React.use = (promise: Promise<any>) => {
    // A simple mock that unwraps the promise value synchronously if possible
    // But since this is a test, we can just return the resolved value if we pass a resolved promise-like object
    // Or we can mock the hook in the component.
    // However, since we are testing the component which calls React.use(params),
    // and we pass a promise to params.
    // Let's rely on the fact that params is passed as a prop.
    // For this test, we might just pass the unwrapped object if we mock the component,
    // but we are testing the default export.
    return { id: '123' };
  };
}

describe('DetallePagoPage', () => {
  const mockSession = {
    data: { accessToken: 'fake-token', user: { name: 'Test User' } },
    status: 'authenticated',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue(mockSession);
  });

  it('renders correctly with populated pago data', async () => {
    const mockPago = {
      id: '123',
      numero_pago: 1,
      fecha_vencimiento: '2025-01-01',
      monto: 5000,
      monto_pagado: 0,
      mora: 0,
      estatus: 'pendiente',
      venta_id: {
        id: 'venta-123',
        cliente_id: {
          id: 'cliente-123',
          nombre: 'Juan',
          apellido_paterno: 'Perez',
        },
        lote_id: {
          id: 'lote-123',
          identificador: 'A-1',
        },
      },
    };

    (pagosApi.getPagoById as any).mockResolvedValue(mockPago);

    const params = Promise.resolve({ id: '123' });

    render(<DetallePagoPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Pago #1')).toBeDefined();
      expect(screen.getByText('Juan Perez')).toBeDefined();
    });
  });

  it('handles null venta_id gracefully without crashing', async () => {
    const mockPagoWithNullVenta = {
      id: '123',
      numero_pago: 1,
      fecha_vencimiento: '2025-01-01',
      monto: 5000,
      monto_pagado: 0,
      mora: 0,
      estatus: 'pendiente',
      venta_id: null, // Simulate null venta_id
    };

    (pagosApi.getPagoById as any).mockResolvedValue(mockPagoWithNullVenta);

    const params = Promise.resolve({ id: '123' });

    // This render should fail if the bug exists
    try {
      render(<DetallePagoPage params={params} />);
    } catch (e) {
      // If it crashes during render, we catch it here?
      // React testing library usually logs console errors but might not throw in a way we can catch easily
      // if it's async. But since the crash is in render, it might.
    }

    await waitFor(() => {
      expect(screen.getByText('Pago #1')).toBeDefined();
    });

    // Check if it renders "N/A" or handles the missing data
    await waitFor(() => {
      expect(screen.getByText('No asignada')).toBeDefined();
    });
  });

  it('handles primitive venta_id (legacy data) correctly', async () => {
    const mockPagoPrimitive = {
      id: '123',
      numero_pago: 1,
      fecha_vencimiento: '2025-01-01',
      monto: 5000,
      monto_pagado: 0,
      mora: 0,
      estatus: 'pendiente',
      venta_id: 'venta-legacy-id', // Primitive string
    };

    (pagosApi.getPagoById as any).mockResolvedValue(mockPagoPrimitive);

    const params = Promise.resolve({ id: '123' });

    render(<DetallePagoPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('venta-legacy-id')).toBeDefined();
    });
  });
});

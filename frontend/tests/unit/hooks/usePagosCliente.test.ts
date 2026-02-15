import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePagosCliente } from '@/hooks/usePagosCliente';
import { getPerfilCliente } from '@/lib/perfil-api';

vi.mock('@/lib/perfil-api', () => ({
  getPerfilCliente: vi.fn(),
}));

describe('usePagosCliente Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna array de pagos', async () => {
    const mockData = {
      perfil: {
        ventas: [
          {
            id: 101,
            pagos: [
              { id: 1, monto: 1000, estatus: 'pagado' },
              { id: 2, monto: 1000, estatus: 'pendiente' },
            ],
          },
        ],
      },
    };
    (getPerfilCliente as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePagosCliente('token'));

    await waitFor(() => {
      expect(result.current.pagos).toHaveLength(2);
    });
  });

  it('filtra pagos por estado', async () => {
    const mockData = {
      perfil: {
        ventas: [
          {
            id: 101,
            pagos: [
              { id: 1, monto: 1000, estatus: 'pagado' },
              { id: 2, monto: 1000, estatus: 'pendiente' },
            ],
          },
        ],
      },
    };
    (getPerfilCliente as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePagosCliente('token'));

    await waitFor(() => {
      expect(result.current.pagos).toHaveLength(2);
    });

    const pagados = result.current.filterPagos('pagado');
    expect(pagados).toHaveLength(1);
    expect(pagados[0].id).toBe(1);

    const pendientes = result.current.filterPagos('pendiente');
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].id).toBe(2);
  });
});

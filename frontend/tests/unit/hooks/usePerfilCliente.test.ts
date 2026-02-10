
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePerfilCliente } from '@/hooks/usePerfilCliente';
import { getPerfilCliente } from '@/lib/perfil-api';

vi.mock('@/lib/perfil-api', () => ({
  getPerfilCliente: vi.fn(),
}));

describe('usePerfilCliente Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null cuando no está autenticado (token null)', async () => {
    const { result } = renderHook(() => usePerfilCliente(null));
    expect(result.current.perfil).toBeUndefined(); // or null based on implementation
    expect(result.current.loading).toBe(false);
  });

  it('retorna datos del cliente cuando está autenticado', async () => {
    const mockData = {
      perfil: { id: 1, nombre: 'Test User' },
      estadisticas: { total_pagado: 100 }
    };
    (getPerfilCliente as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePerfilCliente('fake-token'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.perfil).toEqual(mockData.perfil);
    expect(result.current.estadisticas).toEqual(mockData.estadisticas);
  });

  it('maneja error state', async () => {
    (getPerfilCliente as any).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => usePerfilCliente('fake-token'));

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
    });
    
    expect(result.current.loading).toBe(false);
  });
});

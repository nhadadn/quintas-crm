import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calcularComisiones,
  fetchComisionesByVendedor,
  fetchComisiones,
} from '@/lib/comisiones-api';
import { directusClient, handleAxiosError } from '@/lib/directus-api';

// Mock directusClient
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    get: vi.fn(),
  },
  handleAxiosError: vi.fn(),
}));

describe('Comisiones API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calcularComisiones', () => {
    it('should calculate comisiones with token', async () => {
      const mockToken = 'test-token';
      const mockResponse = { data: [], meta: {} };
      (directusClient.get as any).mockResolvedValue({ data: mockResponse });

      await calcularComisiones('v1', mockToken);

      expect(directusClient.get).toHaveBeenCalledWith(
        '/comisiones/calcular',
        expect.objectContaining({
          params: { venta_id: 'v1' },
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('fetchComisionesByVendedor', () => {
    it('should fetch comisiones by vendedor with token', async () => {
      const mockToken = 'test-token';
      const mockComisiones = [{ id: 'c1' }];
      (directusClient.get as any).mockResolvedValue({ data: { data: mockComisiones } });

      const result = await fetchComisionesByVendedor('vendedor1', mockToken);

      expect(result).toEqual(mockComisiones);
      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/comisiones',
        expect.objectContaining({
          params: expect.objectContaining({
            filter: { vendedor_id: { _eq: 'vendedor1' } },
          }),
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('fetchComisiones', () => {
    it('should fetch comisiones with token', async () => {
      const mockToken = 'test-token';
      const mockComisiones = [{ id: 'c1' }];
      (directusClient.get as any).mockResolvedValue({ data: { data: mockComisiones } });

      const result = await fetchComisiones(mockToken);

      expect(result).toEqual(mockComisiones);
      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/comisiones',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });
});

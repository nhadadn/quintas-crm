import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVentas, getVentaById, fetchVentasByClienteId, createVenta } from '@/lib/ventas-api';
import { directusClient, handleAxiosError } from '@/lib/directus-api';

// Mock directusClient
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  handleAxiosError: vi.fn(),
}));

describe('Ventas API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVentas', () => {
    it('should include Authorization header when token is provided', async () => {
      const mockToken = 'test-token-123';
      const mockData = { data: { data: [] } };
      (directusClient.get as any).mockResolvedValue(mockData);

      await fetchVentas(mockToken);

      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/ventas',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('should not include Authorization header when token is missing', async () => {
      const mockData = { data: { data: [] } };
      (directusClient.get as any).mockResolvedValue(mockData);

      await fetchVentas();

      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/ventas',
        expect.objectContaining({
          headers: {},
        }),
      );
    });

    it('should return empty array and handle error on failure', async () => {
      const mockError = new Error('Network Error');
      (directusClient.get as any).mockRejectedValue(mockError);

      const result = await fetchVentas('invalid-token');

      expect(result).toEqual([]);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'fetchVentas');
    });
  });

  describe('getVentaById', () => {
    it('should fetch venta by ID', async () => {
      const mockVenta = { id: 'v1' };
      (directusClient.get as any).mockResolvedValue({ data: { data: mockVenta } });

      const result = await getVentaById('v1', 'token');

      expect(result).toEqual(mockVenta);
      expect(directusClient.get).toHaveBeenCalledWith('/items/ventas/v1', expect.any(Object));
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Not Found');
      (directusClient.get as any).mockRejectedValue(mockError);

      await expect(getVentaById('v1')).rejects.toThrow(mockError);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'getVentaById');
    });
  });

  describe('fetchVentasByClienteId', () => {
    it('should fetch ventas filtered by cliente_id', async () => {
      const mockVentas = [{ id: 'v1' }];
      (directusClient.get as any).mockResolvedValue({ data: { data: mockVentas } });

      const result = await fetchVentasByClienteId('c1', 'token');

      expect(result).toEqual(mockVentas);
      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/ventas',
        expect.objectContaining({
          params: expect.objectContaining({
            filter: { cliente_id: { _eq: 'c1' } },
          }),
        }),
      );
    });

    it('should return empty array on failure', async () => {
      const mockError = new Error('Error');
      (directusClient.get as any).mockRejectedValue(mockError);

      const result = await fetchVentasByClienteId('c1');

      expect(result).toEqual([]);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'fetchVentasByClienteId');
    });
  });

  describe('createVenta', () => {
    it('should create venta successfully', async () => {
      const mockVentaInput = { monto: 100 };
      const mockCreatedVenta = { id: 'new-id', monto: 100 };
      (directusClient.post as any).mockResolvedValue({ data: { data: mockCreatedVenta } });

      const result = await createVenta(mockVentaInput, 'token');

      expect(result).toEqual(mockCreatedVenta);
      expect(directusClient.post).toHaveBeenCalledWith(
        '/items/ventas',
        expect.objectContaining({
          id: expect.any(String),
          monto: 100,
        }),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token' },
        }),
      );
    });

    it('should use provided ID if present', async () => {
      const mockVentaInput = { id: 'existing-id', monto: 100 };
      (directusClient.post as any).mockResolvedValue({ data: { data: mockVentaInput } });

      await createVenta(mockVentaInput);

      expect(directusClient.post).toHaveBeenCalledWith(
        '/items/ventas',
        expect.objectContaining({
          id: 'existing-id',
        }),
        expect.any(Object),
      );
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Error');
      (directusClient.post as any).mockRejectedValue(mockError);

      await expect(createVenta({})).rejects.toThrow(mockError);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'createVenta');
    });
  });
});

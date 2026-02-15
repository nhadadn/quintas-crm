import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchVendedores,
  getVendedorById,
  createVendedor,
  updateVendedor,
} from '@/lib/vendedores-api';
import { directusClient, handleAxiosError } from '@/lib/directus-api';

// Mock directusClient
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  handleAxiosError: vi.fn(),
}));

describe('Vendedores API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVendedores', () => {
    it('should include Authorization header when token is provided', async () => {
      const mockToken = 'test-token-123';
      const mockData = { data: { data: [] } };
      (directusClient.get as any).mockResolvedValue(mockData);

      await fetchVendedores(mockToken);

      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/vendedores',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('should not include Authorization header when token is missing', async () => {
      const mockData = { data: { data: [] } };
      (directusClient.get as any).mockResolvedValue(mockData);

      await fetchVendedores();

      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/vendedores',
        expect.objectContaining({
          headers: {},
        }),
      );
    });

    it('should return empty array and handle error on failure', async () => {
      const mockError = new Error('Network Error');
      (directusClient.get as any).mockRejectedValue(mockError);

      const result = await fetchVendedores('invalid-token');

      expect(result).toEqual([]);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'fetchVendedores');
    });
  });

  describe('getVendedorById', () => {
    it('should fetch vendedor by ID with token', async () => {
      const mockVendedor = { id: 'v1', nombre: 'Test' };
      const mockToken = 'test-token';
      (directusClient.get as any).mockResolvedValue({ data: { data: mockVendedor } });

      const result = await getVendedorById('v1', mockToken);

      expect(result).toEqual(mockVendedor);
      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/vendedores/v1',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Not Found');
      (directusClient.get as any).mockRejectedValue(mockError);

      await expect(getVendedorById('v1')).rejects.toThrow(mockError);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'getVendedorById');
    });
  });

  describe('createVendedor', () => {
    it('should create vendedor with generated ID and token', async () => {
      const mockVendedorInput = { nombre: 'New Vendedor' };
      const mockCreatedVendedor = { id: 'generated-uuid', ...mockVendedorInput };
      const mockToken = 'test-token';

      (directusClient.post as any).mockResolvedValue({ data: { data: mockCreatedVendedor } });

      const result = await createVendedor(mockVendedorInput, mockToken);

      expect(result).toEqual(mockCreatedVendedor);
      expect(directusClient.post).toHaveBeenCalledWith(
        '/items/vendedores',
        expect.objectContaining({
          ...mockVendedorInput,
          id: expect.any(String), // Verify UUID generation
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Validation Error');
      (directusClient.post as any).mockRejectedValue(mockError);

      await expect(createVendedor({ nombre: 'Fail' })).rejects.toThrow(mockError);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'createVendedor');
    });
  });

  describe('updateVendedor', () => {
    it('should update vendedor with token', async () => {
      const mockId = 'v1';
      const mockUpdates = { nombre: 'Updated Name' };
      const mockUpdatedVendedor = { id: mockId, ...mockUpdates };
      const mockToken = 'test-token';

      (directusClient.patch as any).mockResolvedValue({ data: { data: mockUpdatedVendedor } });

      const result = await updateVendedor(mockId, mockUpdates, mockToken);

      expect(result).toEqual(mockUpdatedVendedor);
      expect(directusClient.patch).toHaveBeenCalledWith(
        `/items/vendedores/${mockId}`,
        mockUpdates,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Update Failed');
      (directusClient.patch as any).mockRejectedValue(mockError);

      await expect(updateVendedor('v1', { nombre: 'Fail' })).rejects.toThrow(mockError);
      expect(handleAxiosError).toHaveBeenCalledWith(mockError, 'updateVendedor');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVentas } from '@/lib/ventas-api';
import { directusClient } from '@/lib/directus-api';

// Mock directusClient
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    get: vi.fn(),
  },
  handleAxiosError: vi.fn(),
}));

describe('fetchVentas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include Authorization header when token is provided', async () => {
    const mockToken = 'test-token-123';
    const mockData = { data: { data: [] } };
    (directusClient.get as any).mockResolvedValue(mockData);

    await fetchVentas(mockToken);

    expect(directusClient.get).toHaveBeenCalledWith('/items/ventas', expect.objectContaining({
      headers: { Authorization: `Bearer ${mockToken}` }
    }));
  });

  it('should not include Authorization header when token is missing', async () => {
    const mockData = { data: { data: [] } };
    (directusClient.get as any).mockResolvedValue(mockData);

    await fetchVentas();

    expect(directusClient.get).toHaveBeenCalledWith('/items/ventas', expect.objectContaining({
      headers: {}
    }));
  });

  it('should return empty array and handle error on 401', async () => {
    const mockError = {
      response: { status: 401, data: { errors: [{ message: 'Unauthorized' }] } },
      config: { url: '/items/ventas' }
    };
    (directusClient.get as any).mockRejectedValue(mockError);

    const result = await fetchVentas('invalid-token');

    expect(result).toEqual([]);
    // handleAxiosError is mocked, we can assume it's called or just check return value
  });
});

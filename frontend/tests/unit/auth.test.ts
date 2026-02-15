import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock environment variables
const originalEnv = process.env;

describe('Auth Client Logic', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, DIRECTUS_URL: 'http://localhost:8055' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should refresh token successfully', async () => {
    // Setup axios mock
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires: 300000, // 5 minutes
        },
      },
    });

    // Mock axios.create to return an object with post method
    (axios.create as any).mockReturnValue({
      post: mockPost,
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });

    // Import function after mocking
    const { refreshAccessToken } = await import('@/lib/auth-client');

    const oldToken = {
      accessToken: 'old_token',
      refreshToken: 'old_refresh_token',
      expiresAt: Date.now() - 1000,
    };

    const newToken = await refreshAccessToken(oldToken);

    expect(mockPost).toHaveBeenCalledWith(
      'http://localhost:8055/auth/refresh',
      expect.objectContaining({
        refresh_token: 'old_refresh_token',
        mode: 'json',
      }),
    );

    expect(newToken).toEqual(
      expect.objectContaining({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      }),
    );
    expect(newToken.error).toBeUndefined();
  });

  it('should handle refresh error', async () => {
    // Setup axios mock to fail
    const mockPost = vi.fn().mockRejectedValue(new Error('Refresh failed'));

    (axios.create as any).mockReturnValue({
      post: mockPost,
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });

    const { refreshAccessToken } = await import('@/lib/auth-client');

    const oldToken = {
      refreshToken: 'bad_refresh_token',
    };

    const newToken = await refreshAccessToken(oldToken);

    expect(newToken.error).toBe('RefreshAccessTokenError');
  });
});

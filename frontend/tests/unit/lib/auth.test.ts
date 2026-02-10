
import { refreshAccessToken } from '@/lib/auth';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock axios and its create method
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockPost = vi.fn();
  const mockCreate = vi.fn(() => ({
    post: mockPost,
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  }));

  return {
    ...actual,
    default: {
      ...actual.default,
      create: mockCreate,
      post: mockPost,
      isAxiosError: actual.isAxiosError,
    },
    create: mockCreate,
    post: mockPost,
    isAxiosError: actual.isAxiosError,
  };
});

// Mock next-auth to avoid initialization errors
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  AuthError: class AuthError extends Error {},
  CredentialsSignin: class CredentialsSignin extends Error {},
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(),
}));

describe('Auth Logic - refreshAccessToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_DIRECTUS_URL = 'http://localhost:8055';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should refresh token successfully when API returns new tokens', async () => {
    // Setup mock response
    const mockResponse = {
      data: {
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires: 900000, // 15 min in ms
        },
      },
    };

    const mockPost = vi.fn().mockResolvedValue(mockResponse);
    (axios.create as unknown as Mock).mockReturnValue({
      post: mockPost,
      defaults: { headers: {} }
    });

    // Reset modules to ensure auth.ts picks up the new mock
    vi.resetModules();
    
    // We need to re-import the module to trigger the top-level code (axios.create)
    const { refreshAccessToken } = await import('@/lib/auth');

    const token = {
      accessToken: 'old_token',
      refreshToken: 'valid_refresh_token',
      expiresAt: Date.now() - 1000,
    };

    const result = await refreshAccessToken(token);

    // In Vitest, if we mock axios.create to return an object with a mockPost,
    // and auth.ts uses that object, calling refreshAccessToken should use mockPost.
    // However, since auth.ts creates authClient at module level,
    // we need to make sure auth.ts is re-evaluated. vi.resetModules() + dynamic import does this.

    // BUT: The mock factory for 'axios' runs once.
    // The `axios.create` inside auth.ts will be called again upon re-import.
    // And it will return the value we configured in `(axios.create as Mock).mockReturnValue(...)`.

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        refresh_token: 'valid_refresh_token',
        mode: 'json',
      })
    );

    expect(result).toEqual({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: expect.any(Number),
      error: undefined,
    });
  });

  it('should return error when refresh fails', async () => {
    const mockPost = vi.fn().mockRejectedValue(new Error('Network Error'));
    (axios.create as unknown as Mock).mockReturnValue({
      post: mockPost,
      defaults: { headers: {} }
    });

    vi.resetModules();
    const { refreshAccessToken } = await import('@/lib/auth');

    const token = {
      accessToken: 'old_token',
      refreshToken: 'invalid_refresh_token',
    };

    const result = await refreshAccessToken(token);

    expect(result).toEqual({
      ...token,
      error: 'RefreshAccessTokenError',
    });
  });
});

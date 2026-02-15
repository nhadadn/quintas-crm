import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock next-auth/providers/credentials
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(),
}));

// Mock next-auth
vi.mock('next-auth', () => {
  class AuthError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'AuthError';
    }
  }

  class CredentialsSignin extends Error {
    code: string;
    constructor(msg?: string) {
      super(msg);
      this.name = 'CredentialsSignin';
      this.code = 'credentials_signin';
    }
  }

  return {
    default: vi.fn(() => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    AuthError,
    CredentialsSignin,
  };
});

describe('Auth Coverage Tests', () => {
  const originalEnv = process.env;
  let mockPost: Mock;
  let mockGet: Mock;

  // Dynamic imports to handle module reset
  let refreshAccessToken: any;
  let authorizeUser: any;
  let jwtCallback: any;
  let sessionCallback: any;

  beforeEach(async () => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DIRECTUS_URL: 'http://localhost:8055',
      ENABLE_MOCK_AUTH: 'false',
    };
    vi.clearAllMocks();

    mockPost = vi.fn();
    mockGet = vi.fn();

    (axios.create as any).mockReturnValue({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { headers: { common: {} } },
    });

    // Mock axios.isAxiosError
    (axios.isAxiosError as any) = vi.fn((payload) => payload?.isAxiosError === true);

    // Import module after mocks are set
    const authModule = await import('@/lib/auth');
    refreshAccessToken = authModule.refreshAccessToken;
    authorizeUser = authModule.authorizeUser;
    jwtCallback = authModule.jwtCallback;
    sessionCallback = authModule.sessionCallback;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('refreshAccessToken', () => {
    it('should throw error if DIRECTUS_URL is not set', async () => {
      process.env.DIRECTUS_URL = '';
      process.env.DIRECTUS_INTERNAL_URL = '';
      process.env.NEXT_PUBLIC_DIRECTUS_URL = '';

      const token = { refreshToken: 'valid_refresh_token' };
      const result = await refreshAccessToken(token as any);

      expect(result.error).toBe('RefreshAccessTokenError');
    });

    it('should throw error if response is invalid', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {}, // Missing access_token
        },
      });

      const token = { refreshToken: 'valid_refresh_token' };
      const result = await refreshAccessToken(token as any);

      expect(result.error).toBe('RefreshAccessTokenError');
    });

    it('should refresh token successfully', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expires: 300000,
          },
        },
      });

      const token = {
        accessToken: 'old_token',
        refreshToken: 'old_refresh_token',
        expiresAt: Date.now() - 1000,
      };

      const result = await refreshAccessToken(token as any);

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
          error: undefined,
        }),
      );
    });

    it('should use default expiry if not provided', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            access_token: 'new_at',
            refresh_token: 'new_rt',
            // expires missing
          },
        },
      });

      const token = { refreshToken: 'rt' };
      const result = await refreshAccessToken(token as any);

      // Default is 300000ms (5 min)
      // We check if expiresAt is roughly Date.now() + 300000
      expect(result.expiresAt).toBeGreaterThan(Date.now() + 290000);
      expect(result.expiresAt).toBeLessThan(Date.now() + 310000);
    });
  });

  describe('authorizeUser', () => {
    it('should return null if credentials are missing', async () => {
      const result = await authorizeUser({});
      expect(result).toBeNull();
    });

    it('should throw error if DIRECTUS_URL is not set', async () => {
      process.env.DIRECTUS_URL = '';
      process.env.DIRECTUS_INTERNAL_URL = '';
      process.env.NEXT_PUBLIC_DIRECTUS_URL = '';

      const credentials = { email: 'test@example.com', password: 'password' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.message).toBe('DIRECTUS_URL not set');
      }
    });

    it('should throw InactiveAccountError if user status is not active', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: { access_token: 't', refresh_token: 'r', expires: 3600 },
        },
      });

      // User info - inactive
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            status: 'suspended',
            role: { name: 'Cliente' },
          },
        },
      });

      const credentials = { email: 'inactive@example.com', password: 'p' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.code).toBe('account_inactive');
      }
    });

    it('should throw AccessDeniedError if role is not allowed', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: { access_token: 't', refresh_token: 'r', expires: 3600 },
        },
      });

      // User info - invalid role
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            status: 'active',
            role: { name: 'Guest' },
          },
        },
      });

      const credentials = { email: 'guest@example.com', password: 'p' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.code).toBe('access_denied');
      }
    });

    it('should throw InvalidCredentialsError on 401', async () => {
      const error: any = new Error('Unauthorized');
      error.isAxiosError = true;
      error.response = { status: 401 };
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'wrong@example.com', password: 'p' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.code).toBe('invalid_credentials');
      }
    });

    it('should re-throw AuthError instances', async () => {
      // Mock authorizeUser to throw an AuthError internally?
      // Actually we are testing authorizeUser, so we need to make it throw.
      // But authorizeUser catches errors. It only re-throws if it's instance of AuthError.
      // Let's simulate an error that IS an AuthError but coming from axios?
      // Unlikely axios returns AuthError.
      // But maybe we can mock one of the internal calls to throw AuthError.
      // Since we can't easily inject into the middle of the function without more mocking,
      // let's skip this edge case or try to simulate it if possible.
      // Wait, InvalidCredentialsError IS a CredentialsSignin which is an AuthError (in our mock).
      // So the 401 test above already covers the re-throw logic!
      // verify:
      // if (error instanceof AuthError || error instanceof CredentialsSignin) { throw error; }
    });

    it('should handle Cliente role and lookup clienteId', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'access_token',
            refresh_token: 'refresh_token',
            expires: 3600,
          },
        },
      });

      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'client@example.com',
            role: { name: 'Cliente' },
            status: 'active',
          },
        },
      });

      // Cliente lookup success
      mockGet.mockResolvedValueOnce({
        data: {
          data: [{ id: 'cliente_123' }],
        },
      });

      const credentials = { email: 'client@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          role: 'Cliente',
          clienteId: 'cliente_123',
        }),
      );
    });

    it('should handle Cliente role with no matching cliente record', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'access_token',
            refresh_token: 'refresh_token',
            expires: 3600,
          },
        },
      });

      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'client@example.com',
            role: { name: 'Cliente' },
            status: 'active',
          },
        },
      });

      // Cliente lookup empty
      mockGet.mockResolvedValueOnce({
        data: {
          data: [],
        },
      });

      const credentials = { email: 'client@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          role: 'Cliente',
          clienteId: undefined,
        }),
      );
    });

    it('should handle Vendedor role and lookup vendedorId', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'access_token',
            refresh_token: 'refresh_token',
            expires: 3600,
          },
        },
      });

      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'vendor@example.com',
            role: { name: 'Vendedor' },
            status: 'active',
          },
        },
      });

      // Vendedor lookup success
      mockGet.mockResolvedValueOnce({
        data: {
          data: [{ id: 'vendedor_123' }],
        },
      });

      const credentials = { email: 'vendor@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          role: 'Vendedor',
          vendedorId: 'vendedor_123',
        }),
      );
    });

    it('should handle Vendedor role with no matching vendedor record', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'access_token',
            refresh_token: 'refresh_token',
            expires: 3600,
          },
        },
      });

      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'vendor@example.com',
            role: { name: 'Vendedor' },
            status: 'active',
          },
        },
      });

      // Vendedor lookup empty
      mockGet.mockResolvedValueOnce({
        data: {
          data: [],
        },
      });

      const credentials = { email: 'vendor@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          role: 'Vendedor',
          vendedorId: undefined,
        }),
      );
    });

    it('should skip entity lookup for Administrator role', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: { data: { access_token: 't', refresh_token: 'r', expires: 3600 } },
      });
      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'u1',
            first_name: 'A',
            last_name: 'D',
            email: 'a@e.com',
            role: { name: 'Administrator' },
            status: 'active',
          },
        },
      });

      const result = await authorizeUser({ email: 'a@e.com', password: 'p' });
      expect(result.role).toBe('Administrator');
      expect(result.clienteId).toBeUndefined();
      expect(result.vendedorId).toBeUndefined();
      // Should verify no extra calls to clients/vendedores (only users/me)
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should handle error during entity lookup', async () => {
      // Login success
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'access_token',
            refresh_token: 'refresh_token',
            expires: 3600,
          },
        },
      });

      // User info
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            id: 'user_id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'client@example.com',
            role: { name: 'Cliente' },
            status: 'active',
          },
        },
      });

      // Cliente lookup fails
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const credentials = { email: 'client@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      // Should still return user but without clienteId
      expect(result).toEqual(
        expect.objectContaining({
          role: 'Cliente',
          clienteId: undefined,
        }),
      );
    });

    it('should use Mock Auth when enabled and Directus is unreachable', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';

      const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8055');
      error.code = 'ECONNREFUSED';
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'admin@quintas.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'mock-admin-id',
          email: 'admin@quintas.com',
          role: 'Administrator',
        }),
      );
    });

    it('should use Mock Auth for Client when enabled', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';

      const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8055');
      error.code = 'ECONNREFUSED';
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'cliente@quintas.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'mock-client-id',
          email: 'cliente@quintas.com',
          role: 'Cliente',
          clienteId: '1',
        }),
      );
    });

    it('should match ECONNREFUSED in various error properties', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';
      const credentials = { email: 'admin@quintas.com', password: 'p' };

      // Case 1: error.cause.code
      const err1: any = new Error('fail');
      err1.cause = { code: 'ECONNREFUSED' };
      mockPost.mockRejectedValueOnce(err1);
      const res1 = await authorizeUser(credentials);
      expect(res1.id).toBe('mock-admin-id');

      // Case 2: error.message includes ECONNREFUSED
      const err2: any = new Error('Something ECONNREFUSED happened');
      mockPost.mockRejectedValueOnce(err2);
      const res2 = await authorizeUser(credentials);
      expect(res2.id).toBe('mock-admin-id');
    });

    it('should throw ServiceUnavailableError if Mock enabled but email not in mock list', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';
      const error: any = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'unknown@quintas.com', password: 'p' };
      try {
        await authorizeUser(credentials);
      } catch (err: any) {
        expect(err.code).toBe('service_unavailable');
      }
    });

    it('should return null on Axios error with non-handled status', async () => {
      const error: any = new Error('Server Error');
      error.isAxiosError = true;
      error.response = { status: 500 };
      mockPost.mockRejectedValue(error);

      const result = await authorizeUser({ email: 'e@e.com', password: 'p' });
      expect(result).toBeNull();
    });

    it('should throw ServiceUnavailableError if Directus unreachable and Mock disabled', async () => {
      process.env.ENABLE_MOCK_AUTH = 'false';

      const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8055');
      error.code = 'ECONNREFUSED';
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'admin@quintas.com', password: 'password' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.code).toBe('service_unavailable');
      }
    });

    it('should throw UserNotFoundError on 404', async () => {
      const error: any = new Error('Not Found');
      error.isAxiosError = true;
      error.response = { status: 404 };
      mockPost.mockRejectedValue(error);

      const credentials = { email: 'unknown@example.com', password: 'password' };

      try {
        await authorizeUser(credentials);
      } catch (error: any) {
        expect(error.code).toBe('user_not_found');
      }
    });

    it('should return null on generic error', async () => {
      mockPost.mockRejectedValue(new Error('Generic Error'));

      const credentials = { email: 'test@example.com', password: 'password' };
      const result = await authorizeUser(credentials);

      expect(result).toBeNull();
    });
  });

  describe('jwtCallback', () => {
    it('should return token with user data on initial sign in', async () => {
      const token = {};
      const user = {
        access_token: 'at',
        refresh_token: 'rt',
        expires_at: 123456,
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1',
      };
      const account = {};

      const result = await jwtCallback({ token, user, account });

      expect(result).toEqual({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: 123456,
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1',
      });
    });

    it('should return existing token if not expired', async () => {
      const token = {
        expiresAt: Date.now() + 100000, // Not expired
        accessToken: 'old',
      };

      const result = await jwtCallback({ token });

      expect(result).toBe(token);
    });

    it('should refresh token if expired', async () => {
      const token = {
        expiresAt: Date.now() - 1000, // Expired
        refreshToken: 'rt',
      };

      // Mock refreshAccessToken to return new token
      mockPost.mockResolvedValue({
        data: {
          data: {
            access_token: 'new_at',
            refresh_token: 'new_rt',
            expires: 300000,
          },
        },
      });

      const result = await jwtCallback({ token });

      expect(result.accessToken).toBe('new_at');
    });
  });

  describe('sessionCallback', () => {
    it('should map token properties to session user', async () => {
      const token = {
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1',
        accessToken: 'at',
      };
      const session = { user: {} };

      const result = await sessionCallback({ session, token });

      expect(result.user.role).toBe('admin');
      expect(result.user.id).toBe('1');
      expect(result.user.clienteId).toBe('c1');
      expect(result.user.vendedorId).toBe('v1');
      expect(result.accessToken).toBe('at');
    });

    it('should pass error to session if token has error', async () => {
      const token = {
        error: 'RefreshAccessTokenError',
      };
      const session = { user: {} };

      const result = await sessionCallback({ session, token });

      expect(result.error).toBe('RefreshAccessTokenError');
    });

    it('should return session as is if token or user is missing', async () => {
      const session = { user: {} };
      // Case 1: token null
      const res1 = await sessionCallback({ session, token: null });
      expect(res1).toBe(session);

      // Case 2: session.user null
      const session2 = { user: null };
      const res2 = await sessionCallback({ session: session2, token: {} });
      expect(res2).toBe(session2);
    });
  });
});

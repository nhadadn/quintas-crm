import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock next-auth/providers/credentials
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn((config) => config),
}));

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  AuthError: class AuthError extends Error {},
  CredentialsSignin: class CredentialsSignin extends Error {},
}));

describe('Auth Logic - authorizeUser', () => {
  let authorizeUser: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv, DIRECTUS_URL: 'http://localhost:8055', ENABLE_MOCK_AUTH: 'false' };
    vi.clearAllMocks();

    // Setup axios mock structure
    const mockPost = vi.fn();
    const mockGet = vi.fn();

    (axios.create as any).mockReturnValue({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });

    (axios.isAxiosError as any) = vi.fn((payload) => payload?.isAxiosError === true);

    // Import the module under test
    const authModule = await import('@/lib/auth');
    authorizeUser = authModule.authorizeUser;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null if credentials are missing', async () => {
    const result = await authorizeUser({});
    expect(result).toBeNull();
  });

  it('should return user object on successful login as Cliente', async () => {
    const mockAuthClient = (axios.create as any)();
    
    // 1. Login response
    mockAuthClient.post.mockResolvedValueOnce({
      data: {
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires: 3600,
        },
      },
    });

    // 2. Me response
    mockAuthClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'user-id',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          status: 'active',
          role: { name: 'Cliente' },
        },
      },
    });

    // 3. Cliente lookup response
    mockAuthClient.get.mockResolvedValueOnce({
      data: {
        data: [{ id: 'client-id' }],
      },
    });

    const result = await authorizeUser({ email: 'john@example.com', password: 'password' });

    expect(result).toEqual({
      id: 'user-id',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: expect.any(Number),
      role: 'Cliente',
      clienteId: 'client-id',
      vendedorId: undefined,
    });

    expect(mockAuthClient.post).toHaveBeenCalledWith(
      'http://localhost:8055/auth/login',
      expect.objectContaining({ email: 'john@example.com' })
    );
  });

  it('should throw InactiveAccountError if user status is not active', async () => {
    const mockAuthClient = (axios.create as any)();
    
    mockAuthClient.post.mockResolvedValueOnce({
      data: { data: { access_token: 't', refresh_token: 'r', expires: 1 } },
    });

    mockAuthClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'user-id',
          status: 'suspended',
          role: { name: 'Cliente' },
        },
      },
    });

    await expect(authorizeUser({ email: 'e', password: 'p' })).rejects.toThrow('Cuenta inactiva');
  });

  it('should throw AccessDeniedError if role is not allowed', async () => {
    const mockAuthClient = (axios.create as any)();
    
    mockAuthClient.post.mockResolvedValueOnce({
      data: { data: { access_token: 't', refresh_token: 'r', expires: 1 } },
    });

    mockAuthClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'user-id',
          status: 'active',
          role: { name: 'UnknownRole' },
        },
      },
    });

    await expect(authorizeUser({ email: 'e', password: 'p' })).rejects.toThrow('Acceso denegado');
  });

  it('should throw InvalidCredentialsError on 401', async () => {
    const mockAuthClient = (axios.create as any)();
    
    const error: any = new Error('401');
    error.isAxiosError = true;
    error.response = { status: 401 };
    
    mockAuthClient.post.mockRejectedValueOnce(error);

    await expect(authorizeUser({ email: 'e', password: 'p' })).rejects.toThrow('Credenciales inválidas');
  });

  it('should throw ServiceUnavailableError on ECONNREFUSED', async () => {
    const mockAuthClient = (axios.create as any)();
    
    const error: any = new Error('connect ECONNREFUSED');
    error.code = 'ECONNREFUSED';
    
    mockAuthClient.post.mockRejectedValueOnce(error);

    await expect(authorizeUser({ email: 'e', password: 'p' })).rejects.toThrow('El servicio de autenticación no está disponible');
  });

  it('should return mock admin user if ENABLE_MOCK_AUTH is true and connection fails', async () => {
    process.env.ENABLE_MOCK_AUTH = 'true';
    const mockAuthClient = (axios.create as any)();
    
    const error: any = new Error('connect ECONNREFUSED');
    error.code = 'ECONNREFUSED';
    
    mockAuthClient.post.mockRejectedValueOnce(error);

    const result = await authorizeUser({ email: 'admin@quintas.com', password: 'any' });

    expect(result).toEqual(expect.objectContaining({
      email: 'admin@quintas.com',
      role: 'Administrator',
      id: 'mock-admin-id'
    }));
  });
});

describe('Auth Callbacks', () => {
  let jwtCallback: any;
  let sessionCallback: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv, DIRECTUS_URL: 'http://localhost:8055' };
    vi.clearAllMocks();

    // Setup axios mock structure
    const mockPost = vi.fn();
    (axios.create as any).mockReturnValue({
      post: mockPost,
    });

    const authModule = await import('@/lib/auth');
    jwtCallback = authModule.jwtCallback;
    sessionCallback = authModule.sessionCallback;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('jwtCallback', () => {
    it('should return token with user data on initial sign in', async () => {
      const user = {
        access_token: 'at',
        refresh_token: 'rt',
        expires_at: 1000,
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1'
      };
      const account = {};
      const token = {};

      const result = await jwtCallback({ token, user, account });

      expect(result).toEqual({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: 1000,
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1'
      });
    });

    it('should return existing token if not expired', async () => {
      const token = {
        expiresAt: Date.now() + 100000, // Valid
        accessToken: 'at'
      };

      const result = await jwtCallback({ token });

      expect(result).toBe(token);
    });

    it('should refresh token if expired', async () => {
      const token = {
        expiresAt: Date.now() - 1000, // Expired
        accessToken: 'old-at',
        refreshToken: 'old-rt'
      };

      const mockAuthClient = (axios.create as any)();
      mockAuthClient.post.mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'new-at',
            refresh_token: 'new-rt',
            expires: 300000
          }
        }
      });

      const result = await jwtCallback({ token });

      expect(result.accessToken).toBe('new-at');
      expect(result.refreshToken).toBe('new-rt');
      expect(mockAuthClient.post).toHaveBeenCalledWith(
        'http://localhost:8055/auth/refresh',
        expect.objectContaining({ refresh_token: 'old-rt' })
      );
    });
  });

  describe('sessionCallback', () => {
    it('should populate session with token data', async () => {
      const token = {
        role: 'admin',
        id: '1',
        clienteId: 'c1',
        vendedorId: 'v1',
        accessToken: 'at'
      };
      const session = { user: {} };

      const result = await sessionCallback({ session, token });

      expect(result.user.role).toBe('admin');
      expect(result.accessToken).toBe('at');
    });

    it('should pass error to session', async () => {
      const token = { error: 'RefreshAccessTokenError' };
      const session = { user: {} };

      const result = await sessionCallback({ session, token });

      expect(result.error).toBe('RefreshAccessTokenError');
    });
  });
});

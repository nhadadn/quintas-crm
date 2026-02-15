import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authenticate,
  resetPassword,
  requestPasswordReset,
  signOutAction,
} from '@/lib/auth-actions';
import { signIn, signOut } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { directusClient } from '@/lib/directus-api';

// Mock next-auth to avoid ESM/CJS issues
vi.mock('next-auth', () => {
  class MockAuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
    }
  }

  return {
    AuthError: MockAuthError,
    CredentialsSignin: class extends MockAuthError {
      constructor() {
        super('CredentialsSignin');
      }
    },
  };
});

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => '127.0.0.1'),
  })),
}));

vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    post: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  loginRateLimiter: {
    check: vi.fn(() => ({ success: true })),
  },
}));

describe('authenticate action', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset rate limiter mock
    const { loginRateLimiter } = await import('@/lib/rate-limit');
    (loginRateLimiter.check as any).mockReturnValue({ success: true });
  });

  it('should validate email and password format', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid-email');
    formData.append('password', 'short');

    const result = await authenticate(undefined, formData);
    expect(result).toBe('Email inválido');
  });

  it('should call signIn with correct credentials and redirect: false', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    await authenticate(undefined, formData);

    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      }),
    );
  });

  it('should return undefined (success) when signIn succeeds', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    // Mock signIn to resolve (simulating redirect: false success)
    vi.mocked(signIn).mockResolvedValueOnce({});

    const result = await authenticate(undefined, formData);
    expect(result).toBeUndefined();
  });

  it('should return undefined (success) when signIn throws NEXT_REDIRECT', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    // Simulate NEXT_REDIRECT error
    const error = new Error('NEXT_REDIRECT');
    vi.mocked(signIn).mockRejectedValueOnce(error);

    const result = await authenticate(undefined, formData);
    expect(result).toBeUndefined();
  });

  it('should handle signIn returning error object (redirect: false)', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'wrongpassword');

    // Simulate signIn returning error object
    vi.mocked(signIn).mockResolvedValueOnce({ error: 'CredentialsSignin' });

    const result = await authenticate(undefined, formData);
    // The outer catch block handles AuthError('CredentialsSignin') -> returns specific message
    expect(result).toBe('Credenciales inválidas. Verifica tu correo y contraseña.');
  });

  it('should handle rate limit exceeded', async () => {
    const { loginRateLimiter } = await import('@/lib/rate-limit');
    (loginRateLimiter.check as any).mockReturnValue({ success: false });

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await authenticate(undefined, formData);
    expect(result).toBe('Demasiados intentos. Por favor intenta de nuevo en 15 minutos.');
  });

  it('should handle CredentialsSignin error', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'wrongpassword');

    // Simulate AuthError
    const error = new AuthError('CredentialsSignin');
    error.type = 'CredentialsSignin';
    vi.mocked(signIn).mockRejectedValueOnce(error);

    const result = await authenticate(undefined, formData);
    expect(result).toBe('Credenciales inválidas. Verifica tu correo y contraseña.');
  });

  it('should handle ServiceUnavailableError', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    // Simulate AuthError
    const error = new AuthError('ServiceUnavailableError');
    error.type = 'ServiceUnavailableError';
    vi.mocked(signIn).mockRejectedValueOnce(error);

    const result = await authenticate(undefined, formData);
    expect(result).toBe(
      'No se pudo conectar con el servidor de autenticación. Por favor intente más tarde.',
    );
  });

  it('should handle generic errors', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const error = new Error('Network error');
    vi.mocked(signIn).mockRejectedValueOnce(error);

    const result = await authenticate(undefined, formData);
    expect(result).toBe('Error de conexión. Por favor contacta al administrador.');
  });
});

describe('requestPasswordReset action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate email format', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid-email');
    const result = await requestPasswordReset(undefined, formData);
    expect(result).toEqual({
      success: false,
      message: 'Por favor ingresa un correo electrónico válido.',
    });
  });

  it('should call directus API on success', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    (directusClient.post as any).mockResolvedValue({});

    const result = await requestPasswordReset(undefined, formData);

    expect(directusClient.post).toHaveBeenCalledWith('/auth/password/request', expect.any(Object));
    expect(result).toEqual({
      success: true,
      message: 'Si el email existe, recibirás un enlace de recuperación',
    });
  });

  it('should handle API errors', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');

    (directusClient.post as any).mockRejectedValue(new Error('API Error'));

    const result = await requestPasswordReset(undefined, formData);

    expect(result).toEqual({
      success: false,
      message: 'Error al solicitar recuperación. Inténtalo nuevamente.',
    });
  });
});

describe('resetPassword action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate matching passwords', async () => {
    const formData = new FormData();
    formData.append('token', 'valid-token');
    formData.append('password', 'password123');
    formData.append('confirm-password', 'password456');

    const result = await resetPassword(undefined, formData);
    expect(result).toEqual({ success: false, message: 'Las contraseñas no coinciden.' });
  });

  it('should validate password length', async () => {
    const formData = new FormData();
    formData.append('token', 'valid-token');
    formData.append('password', 'short');
    formData.append('confirm-password', 'short');

    const result = await resetPassword(undefined, formData);
    expect(result).toEqual({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
  });

  it('should call directusClient.post on success', async () => {
    const formData = new FormData();
    formData.append('token', 'valid-token');
    formData.append('password', 'newpassword123');
    formData.append('confirm-password', 'newpassword123');

    vi.mocked(directusClient.post).mockResolvedValueOnce({});

    const result = await resetPassword(undefined, formData);

    expect(directusClient.post).toHaveBeenCalledWith('/auth/password/reset', {
      token: 'valid-token',
      password: 'newpassword123',
    });
    expect(result).toEqual({ success: true, message: 'Contraseña actualizada exitosamente.' });
  });

  it('should handle API errors', async () => {
    const formData = new FormData();
    formData.append('token', 'invalid-token');
    formData.append('password', 'newpassword123');
    formData.append('confirm-password', 'newpassword123');

    const error = { response: { data: 'Invalid token' } };
    vi.mocked(directusClient.post).mockRejectedValueOnce(error);

    const result = await resetPassword(undefined, formData);

    expect(result).toEqual({
      success: false,
      message: 'No se pudo restablecer la contraseña. El enlace puede haber expirado.',
    });
  });
});

describe('signOutAction', () => {
  it('should call signOut with redirect', async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: '/portal/auth/login' });
  });
});

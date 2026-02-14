import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// 1. Configurar Mocks ANTES de importar el módulo bajo prueba

// Usar vi.hoisted para que la instancia esté disponible en el mock factory
const { mockAxiosInstance, mockGetSession } = vi.hoisted(() => {
  const instance: any = vi.fn((config) => Promise.resolve({ data: { data: [] }, config }));
  instance.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  instance.get = vi.fn();
  instance.post = vi.fn();
  instance.defaults = { headers: { common: {} } };
  
  return { 
    mockAxiosInstance: instance,
    mockGetSession: vi.fn()
  };
});

// Mock de next-auth/react
vi.mock('next-auth/react', () => ({
  getSession: (...args: any[]) => mockGetSession(...args),
}));

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn((payload) => !!payload?.isAxiosError),
    },
  };
});

// Importar el módulo bajo prueba
import { fetchAllLotes, directusClient } from '@/lib/directus-api';

describe('Directus API Auth Refresh Logic', () => {
  let responseInterceptorErrorCallback: any;

  beforeAll(() => {
    // Obtener el callback de error del interceptor de respuesta una sola vez
    // directus-api.ts registra el interceptor al cargarse
    if (mockAxiosInstance.interceptors.response.use.mock.calls.length > 0) {
      responseInterceptorErrorCallback = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Simular ambiente de navegador (necesario para la lógica de refresh)
    global.window = {} as any;
  });

  afterEach(() => {
    delete (global as any).window;
  });

  it('debería registrar interceptores correctamente', () => {
    // Nota: Como usamos vi.clearAllMocks() en beforeEach, no podemos verificar toHaveBeenCalled()
    // porque la llamada ocurrió al importar el módulo (antes del beforeEach).
    // Sin embargo, si responseInterceptorErrorCallback está definido, significa que se registró.
    expect(responseInterceptorErrorCallback).toBeDefined();
  });

  it('debería intentar renovar el token si recibe 401 en el cliente', async () => {
    // Configurar escenario
    const error401 = {
      isAxiosError: true,
      response: { 
        status: 401, 
        data: { errors: [{ message: 'Token expired' }] } 
      },
      config: { 
        headers: { Authorization: 'Bearer old-token' },
        _retry: undefined 
      },
    };

    // Mock getSession devuelve nuevo token
    mockGetSession.mockResolvedValueOnce({ accessToken: 'new-token' });

    // Ejecutar el interceptor de error
    await responseInterceptorErrorCallback(error401);

    // Verificar comportamiento
    expect(mockGetSession).toHaveBeenCalled();
    // Verificar que se actualizó el header en la config original
    expect(error401.config.headers.Authorization).toBe('Bearer new-token');
    // Verificar que se reintentó la petición (llamada a la instancia de axios)
    expect(mockAxiosInstance).toHaveBeenCalledWith(error401.config);
  });

  it('NO debería reintentar si ya se reintentó (_retry = true)', async () => {
    const error401Retry = {
      isAxiosError: true,
      response: { status: 401 },
      config: { 
        headers: { Authorization: 'Bearer old-token' },
        _retry: true // Ya se intentó
      },
    };

    try {
      await responseInterceptorErrorCallback(error401Retry);
    } catch (e) {
      // Esperamos que falle/rechace la promesa
    }

    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('NO debería reintentar si no estamos en el navegador (SSR)', async () => {
    delete (global as any).window; // Simular servidor

    const error401 = {
      isAxiosError: true,
      response: { status: 401 },
      config: { headers: { Authorization: 'Bearer old-token' } },
    };

    try {
      await responseInterceptorErrorCallback(error401);
    } catch (e) {
      // Esperamos error
    }

    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('debería manejar fallo en renovación de token', async () => {
    const error401 = {
      isAxiosError: true,
      response: { status: 401 },
      config: { headers: { Authorization: 'Bearer old-token' } },
    };

    // Mock getSession falla o devuelve null
    mockGetSession.mockResolvedValueOnce(null);

    try {
      await responseInterceptorErrorCallback(error401);
    } catch (e) {
      // Debe lanzar el error original o uno nuevo
    }

    expect(mockGetSession).toHaveBeenCalled();
    // No debe reintentar
    expect(mockAxiosInstance).not.toHaveBeenCalled();
  });
  
  it('fetchAllLotes debería usar el token proporcionado', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
    
    await fetchAllLotes('my-token');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/items/lotes',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token'
        })
      })
    );
  });
});

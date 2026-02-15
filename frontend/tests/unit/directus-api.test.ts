import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  directusClient,
  handleAxiosError,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/directus-api';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
    })),
    isAxiosError: vi.fn((payload) => !!payload.isAxiosError),
  };
  return {
    default: mockAxios,
  };
});

describe('Directus API Enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAxiosError', () => {
    it('should extract message from 401 error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            errors: [{ message: 'Invalid credentials' }],
          },
        },
        message: 'Request failed',
      };

      try {
        handleAxiosError(error, 'test');
      } catch (e: any) {
        expect(e).toBeInstanceOf(UnauthorizedError);
        expect(e.message).toBe('Invalid credentials');
      }
    });

    it('should use default message for 401 if no details', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
        message: 'Request failed',
      };

      try {
        handleAxiosError(error, 'test');
      } catch (e: any) {
        expect(e).toBeInstanceOf(UnauthorizedError);
        expect(e.message).toContain('No autorizado');
      }
    });

    it('should handle 403 correctly', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            errors: [{ message: 'You do not have permission' }],
          },
        },
        message: 'Forbidden',
      };

      try {
        handleAxiosError(error, 'test');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ForbiddenError);
        expect(e.message).toBe('You do not have permission');
      }
    });
  });
});

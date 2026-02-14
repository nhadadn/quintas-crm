import { jest } from '@jest/globals';

// Hoist mock definition
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn(),
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
    decode: jest.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import {
  createOAuthMiddleware,
  requireScopes,
} from '../../../../extensions/middleware/oauth-auth.mjs';
import { mockContext } from '../../setup';

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('OAuth Middleware', () => {
  let middleware;
  let itemsServiceMock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Mock Context
    const { ItemsService } = mockContext.services;
    itemsServiceMock = {
      readByQuery: jest.fn(),
    };
    ItemsService.mockImplementation(() => itemsServiceMock);

    // Initialize Middleware
    middleware = createOAuthMiddleware(mockContext);
  });

  test('should return 401 if Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = mockRes();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'unauthorized' }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if Authorization header is invalid', async () => {
    const req = { headers: { authorization: 'Basic 123' } };
    const res = mockRes();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'unauthorized' }));
  });

  test('should return 401 if JWT is invalid', async () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = mockRes();

    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });
    jwt.default.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_token' }));
  });

  test('should return 401 if token not found in database', async () => {
    const req = { headers: { authorization: 'Bearer valid-jwt' } };
    const res = mockRes();

    jwt.verify.mockReturnValue({ sub: 'user-1' });
    jwt.default.verify.mockReturnValue({ sub: 'user-1' });
    itemsServiceMock.readByQuery.mockResolvedValue([]);

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_description: 'Token not found or revoked' })
    );
  });

  test('should return 401 if token is expired in database', async () => {
    const req = { headers: { authorization: 'Bearer valid-jwt' } };
    const res = mockRes();

    jwt.verify.mockReturnValue({ sub: 'user-1' });
    jwt.default.verify.mockReturnValue({ sub: 'user-1' });
    itemsServiceMock.readByQuery.mockResolvedValue([
      {
        id: 'token-1',
        expires_at: new Date(Date.now() - 10000).toISOString(), // Expired
      },
    ]);

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_description: 'Token expired' })
    );
  });

  test('should call next() and populate req.oauth if token is valid', async () => {
    const req = { headers: { authorization: 'Bearer valid-jwt' }, accountability: {} };
    const res = mockRes();

    jwt.verify.mockReturnValue({ sub: 'user-1' });
    jwt.default.verify.mockReturnValue({ sub: 'user-1' });
    itemsServiceMock.readByQuery.mockResolvedValue([
      {
        id: 'token-1',
        user_id: 'user-1',
        client_id: 'client-1',
        scopes: ['read:ventas'],
        expires_at: new Date(Date.now() + 10000).toISOString(), // Valid
      },
    ]);

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.oauth).toEqual({
      user_id: 'user-1',
      client_id: 'client-1',
      scopes: ['read:ventas'],
      token_id: 'token-1',
    });
    expect(req.accountability.user).toBe('user-1');
  });
});

describe('Scope Validation Middleware', () => {
  let scopeMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 if authentication is missing', () => {
    scopeMiddleware = requireScopes(['read:data']);
    const req = {}; // No oauth property
    const res = mockRes();

    scopeMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'unauthorized',
        error_description: 'Authentication required for scope validation',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 403 if user misses required scopes', () => {
    scopeMiddleware = requireScopes(['write:data']);
    const req = {
      oauth: {
        scopes: ['read:data'],
      },
    };
    const res = mockRes();

    scopeMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'insufficient_scope',
        error_description: expect.stringContaining('Missing required scopes: write:data'),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next() if user has all required scopes', () => {
    scopeMiddleware = requireScopes(['read:data', 'write:data']);
    const req = {
      oauth: {
        scopes: ['read:data', 'write:data', 'delete:data'],
      },
    };
    const res = mockRes();

    scopeMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should call next() if no scopes are required', () => {
    scopeMiddleware = requireScopes([]);
    const req = {
      oauth: {
        scopes: ['read:data'],
      },
    };
    const res = mockRes();

    scopeMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { authConfig } from '@/lib/auth.config';

// Helper to create mock context
function createMockContext(pathname: string, auth: any = null) {
  const nextUrl = new URL(`http://localhost:3000${pathname}`);
  return {
    auth,
    request: {
      nextUrl,
    },
  };
}

describe('Middleware Authorization Logic', () => {
  const { authorized } = authConfig.callbacks as any;

  it('should allow access to login page when not logged in', async () => {
    const context = createMockContext('/portal/auth/login');
    const result = await authorized(context);
    expect(result).toBe(true);
  });

  it('should redirect to portal when accessing login page while logged in', async () => {
    const context = createMockContext('/portal/auth/login', { user: { role: 'Cliente' } });
    const result = await authorized(context);
    // Response.redirect returns a Response object
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get('location')).toBe('http://localhost:3000/portal');
  });

  it('should deny access to portal when not logged in', async () => {
    const context = createMockContext('/portal/dashboard');
    const result = await authorized(context);
    expect(result).toBe(false);
  });

  it('should allow access to portal when logged in as Cliente', async () => {
    const context = createMockContext('/portal/dashboard', { user: { role: 'Cliente' } });
    const result = await authorized(context);
    expect(result).toBe(true);
  });

  it('should redirect to error when logged in as non-Cliente on portal', async () => {
    const context = createMockContext('/portal/dashboard', { user: { role: 'Admin' } });
    const result = await authorized(context);
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get('location')).toContain('/portal/auth/error?error=AccessDenied');
  });

  it('should allow access to non-portal routes (e.g. public site)', async () => {
    const context = createMockContext('/');
    const result = await authorized(context);
    expect(result).toBe(true);
  });
});

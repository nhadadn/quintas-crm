import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // 3 intentos en 1 segundo para tests rápidos
    rateLimiter = new RateLimiter(3, 1000);
  });

  it('should allow initial requests', () => {
    const result = rateLimiter.check('127.0.0.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should decrement remaining count', () => {
    rateLimiter.check('127.0.0.1');
    const result = rateLimiter.check('127.0.0.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should block after limit reached', () => {
    rateLimiter.check('127.0.0.1'); // 1
    rateLimiter.check('127.0.0.1'); // 2
    rateLimiter.check('127.0.0.1'); // 3 (Last allowed)

    const result = rateLimiter.check('127.0.0.1'); // 4 (Blocked)
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    rateLimiter.check('127.0.0.1');
    rateLimiter.check('127.0.0.1');
    rateLimiter.check('127.0.0.1');

    // Wait for window to expire (1.1s)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = rateLimiter.check('127.0.0.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should track different IPs independently', () => {
    rateLimiter.check('IP_A');
    rateLimiter.check('IP_A');
    rateLimiter.check('IP_A');

    const resultA = rateLimiter.check('IP_A'); // Blocked
    const resultB = rateLimiter.check('IP_B'); // Allowed

    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });
});

/**
 * Simple in-memory rate limiter
 * Stores attempts by key (IP) with an expiration time.
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; expiresAt: number }>;
  private limit: number;
  private windowMs: number;
  private blockDurationMs: number;

  constructor(
    limit: number = 5,
    windowMs: number = 15 * 60 * 1000,
    blockDurationMs: number = 15 * 60 * 1000,
  ) {
    this.attempts = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  /**
   * Check if a key is rate limited.
   * Increments the counter if not blocked.
   * @param key Unique identifier (e.g., IP address)
   * @returns { success: boolean, remaining: number }
   */
  check(key: string): { success: boolean; remaining: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    // Clean up expired records
    if (record && now > record.expiresAt) {
      this.attempts.delete(key);
    }

    const currentRecord = this.attempts.get(key);

    if (!currentRecord) {
      this.attempts.set(key, {
        count: 1,
        expiresAt: now + this.windowMs,
      });
      return { success: true, remaining: this.limit - 1 };
    }

    if (currentRecord.count >= this.limit) {
      // Check if we are in the block duration
      // In this simple implementation, the window effectively acts as the block duration
      // if the count is reached.
      return { success: false, remaining: 0 };
    }

    currentRecord.count += 1;
    // Refresh expiration if needed, or keep original window?
    // Usually fixed window: expiresAt doesn't change.
    // Sliding window: expiresAt updates.
    // Requirement: "Bloquear temporalmente después de 5 intentos fallidos"
    // We'll keep the original window.

    return { success: true, remaining: this.limit - currentRecord.count };
  }

  /**
   * Reset attempts for a key (e.g., on successful login)
   */
  reset(key: string) {
    this.attempts.delete(key);
  }
}

// Global instance for login rate limiting
// 100 attempts in 1 minute (Dev mode)
export const loginRateLimiter = new RateLimiter(100, 1 * 60 * 1000);

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Stripe Service Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_SECRET_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when STRIPE_SECRET_KEY is missing', async () => {
    // Import the module dynamically to trigger fresh execution/state if needed
    // But mainly we need getStripe to run with empty env
    const stripeService = await import('../src/stripe-service.js');

    // We need to call a function that uses getStripe()
    await expect(stripeService.createPaymentIntent(100)).rejects.toThrow(
      'Stripe no está configurado'
    );

    expect(console.error).toHaveBeenCalledWith(
      '❌ STRIPE_SECRET_KEY no está definida en las variables de entorno'
    );
  });
});

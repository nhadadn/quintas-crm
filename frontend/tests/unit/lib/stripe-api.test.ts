
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent, createSubscription, getPaymentStatus } from '@/lib/stripe-api';
import { directusClient } from '@/lib/directus-api';

vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Stripe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('returns clientSecret and paymentIntentId', async () => {
      const mockResponse = {
        data: {
          clientSecret: 'secret_123',
          paymentIntentId: 'pi_123',
        },
      };
      (directusClient.post as any).mockResolvedValue(mockResponse);

      const result = await createPaymentIntent(1000, 1, 'cus_123');

      expect(directusClient.post).toHaveBeenCalledWith('/stripe/create-payment-intent', {
        amount: 1000,
        pago_id: 1,
        cliente_id: 'cus_123',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createSubscription', () => {
    it('returns subscription details', async () => {
      const mockResponse = {
        data: {
          subscriptionId: 'sub_123',
          clientSecret: 'secret_456',
          nextPaymentDate: '2023-01-01',
          totalAmount: 500,
        },
      };
      (directusClient.post as any).mockResolvedValue(mockResponse);

      const result = await createSubscription('cus_123', 'sale_123', 'plan_123');

      expect(directusClient.post).toHaveBeenCalledWith('/stripe/create-subscription', {
        cliente_id: 'cus_123',
        venta_id: 'sale_123',
        plan_id: 'plan_123',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPaymentStatus', () => {
    it('returns status', async () => {
      const mockResponse = {
        data: {
          status: 'succeeded',
        },
      };
      (directusClient.get as any).mockResolvedValue(mockResponse);

      const result = await getPaymentStatus('pi_123');

      expect(directusClient.get).toHaveBeenCalledWith('/stripe/payment-status/pi_123');
      expect(result).toEqual(mockResponse.data);
    });
  });
});

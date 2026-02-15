import { directusClient } from './directus-api';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
  nextPaymentDate: string;
  totalAmount: number;
}

export async function createPaymentIntent(
  amount: number,
  pagoId: string | number,
  clienteId: string,
  token?: string,
): Promise<PaymentIntentResponse> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await directusClient.post(
    '/pagos/create-payment-intent',
    {
      amount,
      pago_id: pagoId,
      cliente_id: clienteId,
    },
    { headers },
  );
  return response.data;
}

export async function createSubscription(
  clienteId: string,
  ventaId: string,
  planId: string,
  token?: string,
): Promise<SubscriptionResponse> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await directusClient.post(
    '/pagos/create-subscription',
    {
      cliente_id: clienteId,
      venta_id: ventaId,
      plan_id: planId,
    },
    { headers },
  );
  return response.data;
}

export async function getPaymentStatus(paymentIntentId: string, token?: string): Promise<any> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await directusClient.get(`/stripe/payment-status/${paymentIntentId}`, {
    headers,
  });
  return response.data;
}

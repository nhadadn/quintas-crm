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
): Promise<PaymentIntentResponse> {
  const response = await directusClient.post('/stripe/create-payment-intent', {
    amount,
    pago_id: pagoId,
    cliente_id: clienteId,
  });
  return response.data;
}

export async function createSubscription(
  clienteId: string,
  ventaId: string,
  planId: string,
): Promise<SubscriptionResponse> {
  const response = await directusClient.post('/stripe/create-subscription', {
    cliente_id: clienteId,
    venta_id: ventaId,
    plan_id: planId,
  });
  return response.data;
}

export async function getPaymentStatus(paymentIntentId: string): Promise<any> {
  const response = await directusClient.get(`/stripe/payment-status/${paymentIntentId}`);
  return response.data;
}

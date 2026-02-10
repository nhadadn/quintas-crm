import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '@/lib/stripe-api';

interface UseStripePaymentResult {
  processPayment: (
    amount: number,
    pagoId: string | number,
    clienteId: string,
    returnUrl?: string,
  ) => Promise<any>; // Returns PaymentIntent or null
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useStripePayment(): UseStripePaymentResult {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const processPayment = async (
    amount: number,
    pagoId: string | number,
    clienteId: string,
    returnUrl?: string,
  ) => {
    if (!stripe || !elements) {
      setError('Stripe no está inicializado.');
      return null;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('No se encontró el elemento de tarjeta.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Crear PaymentIntent en backend para obtener clientSecret
      const { clientSecret } = await createPaymentIntent(amount, pagoId, clienteId);

      // 2. Confirmar pago con tarjeta
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Error al procesar el pago.');
        return null;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        return paymentIntent;
      } else {
        setError(`El pago no se completó. Estado: ${paymentIntent?.status}`);
        return null;
      }
    } catch (err: any) {
      console.error('Error en proceso de pago:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading, error, clearError };
}

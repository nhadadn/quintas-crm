import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2 } from 'lucide-react';
import { createPaymentIntent } from '@/lib/stripe-api';

// Initialize Stripe outside of component to avoid recreating stripe object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface ModalPagoStripeProps {
  isOpen: boolean;
  onClose: () => void;
  pagoId: number | string;
  clienteId: string;
  monto: number;
  onSuccess: () => void;
}

const CheckoutForm = ({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/portal/pagos/confirmacion',
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Error desconocido');
      onError(error.message || 'Error desconocido');
      setIsLoading(false);
    } else {
      // Payment succeeded
      onSuccess();
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      {message && <div className="text-red-500 text-sm">{message}</div>}
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
      >
        {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Pagar Ahora'}
      </button>
    </form>
  );
};

export function ModalPagoStripe({
  isOpen,
  onClose,
  pagoId,
  clienteId,
  monto,
  onSuccess,
}: ModalPagoStripeProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pagoId && clienteId) {
      setClientSecret(null);
      setError(null);

      // Create PaymentIntent
      createPaymentIntent(monto, pagoId, clienteId)
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error('Error creating payment intent', err);
          setError('No se pudo iniciar el pago. Intente nuevamente.');
        });
    }
  }, [isOpen, pagoId, clienteId, monto]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="text-lg font-semibold text-slate-100">Realizar Pago Seguro</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-slate-700/30 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Monto a pagar:</p>
            <p className="text-2xl font-bold text-emerald-400">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 p-3 rounded mb-4 text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'night', labels: 'floating' } }}
            >
              <CheckoutForm onSuccess={onSuccess} onError={(msg) => console.log(msg)} />
            </Elements>
          ) : (
            !error && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="animate-spin w-8 h-8 text-emerald-500" />
                <p className="text-slate-400 text-sm">Iniciando sesión segura con Stripe...</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPaymentStatus } from '@/lib/stripe-api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

function PaymentConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentIntentId =
    searchParams.get('payment_intent') || searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status'); // 'succeeded' or 'failed'

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'failed' | 'processing' | 'unknown'>(
    'processing',
  );
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!paymentIntentId) {
      setLoading(false);
      setStatus('unknown');
      return;
    }

    const checkStatus = async () => {
      try {
        // If we have redirect_status from URL, we can use it for initial state
        if (redirectStatus === 'failed') {
          setStatus('failed');
          setLoading(false);
          return;
        }

        // Fetch detailed status from backend
        const details = await getPaymentStatus(paymentIntentId);
        setPaymentDetails(details);

        if (details.status === 'succeeded') {
          setStatus('success');
        } else if (details.status === 'requires_payment_method' || details.status === 'canceled') {
          setStatus('failed');
          setErrorMsg(details.last_payment_error?.message || 'El pago no pudo ser completado.');
        } else if (details.status === 'processing') {
          setStatus('processing');
        } else {
          setStatus('unknown');
        }
      } catch (err: any) {
        console.error('Error checking payment status:', err);
        setErrorMsg('No se pudo verificar el estado del pago. Por favor contacta a soporte.');
        setStatus('unknown');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [paymentIntentId, redirectStatus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-fade-in">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
        <h2 className="text-xl font-semibold text-gray-800">Verificando pago...</h2>
        <p className="text-gray-500 mt-2">Por favor espera un momento.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100 animate-slide-up">
        <div className="bg-green-50 p-8 text-center border-b border-green-100">
          <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">¡Pago Exitoso!</h1>
          <p className="text-green-600 font-medium">
            Tu transacción ha sido procesada correctamente.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Detalles de la Transacción
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Monto Pagado</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(paymentDetails?.amount / 100).toLocaleString('es-MX')}{' '}
                  <span className="text-sm font-normal text-gray-500">MXN</span>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(paymentDetails?.created * 1000).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Referencia</p>
                <p className="text-lg font-medium text-gray-900 font-mono">
                  **** {paymentDetails?.payment_method_details?.card?.last4 || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">ID de Transacción</p>
                <p className="text-sm font-medium text-gray-900 break-all">{paymentIntentId}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              onClick={() => window.print()}
            >
              <Download className="w-5 h-5" />
              Descargar Recibo
            </button>

            <Link
              href="/portal/pagos"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver a Mis Pagos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-red-100 animate-shake">
        <div className="bg-red-50 p-8 text-center border-b border-red-100">
          <div className="mx-auto bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-red-800 mb-2">Pago Fallido</h1>
          <p className="text-red-600 font-medium">Hubo un problema al procesar tu pago.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-red-50 rounded-xl p-6 border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Razón del error</h3>
              <p className="text-red-700">
                {errorMsg || 'La tarjeta fue rechazada o ocurrió un error de conexión.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href={`/portal/pagos`} // Ideally link back to the specific payment page if possible
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className="w-5 h-5" />
              Intentar Nuevamente
            </Link>

            <Link
              href="/contacto"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              Contactar Soporte
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unknown or invalid state
  return (
    <div className="max-w-2xl mx-auto text-center p-8">
      <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">No se encontró información del pago</h2>
      <p className="text-gray-500 mb-8">
        No pudimos recuperar los detalles de la transacción. Si crees que esto es un error, verifica
        tu estado de cuenta o contacta a soporte.
      </p>
      <Link
        href="/portal/pagos"
        className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a Mis Pagos
      </Link>
    </div>
  );
}

export default function PaymentConfirmationPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
            <h2 className="text-xl font-semibold text-gray-800">Cargando...</h2>
          </div>
        }
      >
        <PaymentConfirmationContent />
      </Suspense>
    </div>
  );
}

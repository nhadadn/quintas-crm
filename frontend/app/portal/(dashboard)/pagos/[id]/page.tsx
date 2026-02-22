import { getPagoById } from '@/lib/pagos-api';
import { PaymentForm } from '@/components/stripe/PaymentForm';
import { StripeProviderWrapper } from '@/components/stripe/StripeProviderWrapper';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Calendar, CreditCard, DollarSign, CheckCircle } from 'lucide-react';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    redirect('/portal/auth/login');
  }

  const role = session.user?.role || '';
  const isClientRole = role === 'Cliente' || role === 'ROL_CLIENTE';
  const isAdminRole =
    role === 'Administrator' || role === 'SuperAdmin' || role === 'ROL_ADMIN';

  const { id } = await params;

  try {
    const pago = await getPagoById(id, session.accessToken);

    if (!pago) {
      notFound();
    }

    // Cast relations (assuming they are expanded as objects based on 'fields: *.*.*' in getPagoById)
    const venta = pago.venta_id as any;
    const cliente = venta?.cliente_id;
    const clienteId = typeof cliente === 'object' ? cliente?.id : cliente;
    const ventaId = typeof pago.venta_id === 'object' ? (pago.venta_id as any).id : pago.venta_id;

    // Validation: Payment status
    const isPayable = pago.estatus === 'pendiente' || pago.estatus === 'atrasado';

    if (!isPayable) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-800 mb-2">
              Este pago ya ha sido procesado
            </h1>
            <p className="text-green-600 mb-6">
              El estatus actual del pago es:{' '}
              <span className="font-semibold uppercase">{pago.estatus}</span>
            </p>
            <Link
              href="/portal/pagos"
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Volver a mis pagos
            </Link>
          </div>
        </div>
      );
    }

    if (!clienteId) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-red-800">Error de Datos</h2>
              <p className="text-red-600">
                No se pudo identificar al cliente asociado a este pago.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isClientRole) {
      const sessionClienteId = (session.user as any)?.clienteId as string | undefined;

      if (!sessionClienteId || String(sessionClienteId) !== String(clienteId)) {
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
              <div>
                <h2 className="text-lg font-bold text-red-800">Acceso no autorizado</h2>
                <p className="text-red-600">
                  No tienes permiso para acceder a este pago. Solo puedes visualizar pagos asociados a
                  tu cuenta.
                </p>
                <Link
                  href="/portal/pagos"
                  className="text-red-700 underline mt-2 inline-block"
                >
                  Volver a mis pagos
                </Link>
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Realizar Pago</h1>
          <p className="text-gray-500">
            Completa la información para procesar tu pago de manera segura.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Resumen del Pago */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              Resumen del Pago
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500">Concepto</span>
                <span className="font-medium text-gray-900">Mensualidad #{pago.numero_pago}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500">Venta ID</span>
                <span className="font-medium text-gray-900">#{ventaId}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Vencimiento
                </span>
                <span className="font-medium text-gray-900">
                  {new Date(pago.fecha_vencimiento).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500">Estatus</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${pago.estatus === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${pago.estatus === 'atrasado' ? 'bg-red-100 text-red-800' : ''}
                `}
                >
                  {pago.estatus}
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-medium text-gray-900">Total a Pagar</span>
                  <span className="text-3xl font-bold text-indigo-600">
                    ${pago.monto.toLocaleString('es-MX')}
                  </span>
                </div>
                <p className="text-xs text-gray-400 text-right mt-1">MXN (Pesos Mexicanos)</p>
              </div>
            </div>
          </div>

          {/* Formulario de Pago */}
          <div>
            <StripeProviderWrapper>
              <PaymentForm
                ventaId={String(ventaId)}
                numeroPago={pago.numero_pago}
                monto={pago.monto}
                pagoId={pago.id}
                clienteId={String(clienteId)}
              />
            </StripeProviderWrapper>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading payment page:', error);
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-red-800">Error del Sistema</h2>
            <p className="text-red-600">
              No se pudo cargar la información del pago. Por favor intente más tarde.
            </p>
            <Link href="/portal/pagos" className="text-red-700 underline mt-2 inline-block">
              Volver a mis pagos
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

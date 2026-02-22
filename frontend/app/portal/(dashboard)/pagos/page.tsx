import React from 'react';
import { auth } from '@/lib/auth';
import { getPerfilCliente, PerfilResponse, PagoPerfil } from '@/lib/perfil-api';
import { agregarMovimientosDeVentas } from '@/lib/pagos-helpers';
import { redirect } from 'next/navigation';
import { ErrorMessage } from '@/components/portal/ErrorMessage';
import { TablaPagosCliente } from '@/components/portal/pagos/TablaPagosCliente';
import { CreditCard, Download } from 'lucide-react';

export const metadata = {
  title: 'Mis Pagos | Portal Clientes',
  description: 'Historial de pagos y estado de cuenta',
};

export default async function PagosPage() {
  const session = await auth();

  if (!session || !session.user || !session.accessToken) {
    redirect('/portal/auth/login');
  }

  // Si es Administrador o Vendedor, redirigir al Dashboard administrativo
  const role = session.user?.role || '';
  if (['Administrator', 'Vendedor', 'admin', 'Admin'].includes(role)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card shadow rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Vista de Pagos ({role})
          </h2>
          <p className="text-muted-foreground mb-4">
            Como administrador/vendedor, no tienes un historial de pagos personal. Por favor,
            utiliza el Dashboard Administrativo para ver los pagos de los clientes.
          </p>
          <a
            href="/dashboard/pagos"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ir al Dashboard de Pagos
          </a>
        </div>
      </div>
    );
  }

  let perfilData: PerfilResponse | null = null;
  let error = null;

  try {
    perfilData = await getPerfilCliente(session.accessToken);
  } catch (err) {
    console.error('Error fetching perfil for pagos:', err);
    error = 'No se pudo cargar el historial de pagos.';
  }

  if (error || !perfilData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <ErrorMessage
          title="Error al cargar pagos"
          message={error || 'Ocurrió un error inesperado al cargar tu historial.'}
        />
      </div>
    );
  }

  const { perfil, estadisticas } = perfilData;

  // Historial desde ledger: pagos_movimientos (incluye reembolsos)
  const allPagos: PagoPerfil[] = agregarMovimientosDeVentas(perfil.ventas);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historial de Pagos</h1>
            <p className="text-muted-foreground mt-1">
              Consulta y descarga tus comprobantes de pago.
            </p>
          </div>
        </div>
      </div>

      <TablaPagosCliente pagos={allPagos} estadisticas={estadisticas} clienteId={perfil.id} />
    </div>
  );
}

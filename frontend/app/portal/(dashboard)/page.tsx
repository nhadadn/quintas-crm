import React from 'react';
import { auth } from '@/lib/auth';
import { getPerfilCliente, PerfilResponse, VentaPerfil, PagoPerfil } from '@/lib/perfil-api';
import { redirect } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/StatsCard';
import TablaAmortizacion from '@/components/gestion/TablaAmortizacion';
import { ErrorMessage } from '@/components/portal/ErrorMessage';
import { FilaAmortizacion } from '@/types/erp';

// Helper for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

export default async function PortalClientePage() {
  const session = await auth();

  if (!session || !session.user || !session.accessToken) {
    redirect('/portal/auth/login');
  }

  // Si no es rol "Cliente", mostrar vista informativa y botón al Dashboard administrativo.
  // Esto previene errores al intentar cargar perfil de cliente para usuarios administrativos.
  const role = session.user?.role || '';
  
  if (role !== 'Cliente') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Vista de Portal ({role || 'Sin Rol'})
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Este portal está diseñado exclusivamente para Clientes.
            Como usuario con rol <strong>{role}</strong>, no tienes un estado de cuenta asociado aquí.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ir al Dashboard Administrativo
          </a>
        </div>
      </div>
    );
  }

  let perfilData: PerfilResponse | null = null;
  let error = null;

  try {
    perfilData = await getPerfilCliente(session.accessToken);
  } catch (err: any) {
    console.error('Error fetching perfil:', err);
    error = err.message || 'No se pudo cargar la información del perfil.';
  }

  if (error || !perfilData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage
          title="Error al cargar perfil"
          message={error || 'Ocurrió un error inesperado al cargar tus datos.'}
          className="animate-fade-in"
        />
      </div>
    );
  }

  const { perfil, estadisticas } = perfilData;
  const ventaActiva = perfil.ventas && perfil.ventas.length > 0 ? perfil.ventas[0] : null;

  // Stats for cards
  const stats = [
    {
      title: 'Total Pagado',
      value: formatCurrency(estadisticas.total_pagado),
      change: `${estadisticas.pagos_realizados} pagos realizados`,
      changeType: 'positive' as const,
      changeLabel: '',
    },
    {
      title: 'Saldo Pendiente',
      value: formatCurrency(estadisticas.saldo_pendiente),
      change: `${((estadisticas.saldo_pendiente / estadisticas.total_compras) * 100).toFixed(1)}% restante`,
      changeType: 'neutral' as const,
      changeLabel: '',
    },
    {
      title: 'Próximo Pago',
      value: estadisticas.proximo_pago ? formatCurrency(estadisticas.proximo_pago.monto) : '$0.00',
      change: estadisticas.proximo_pago
        ? `Vence: ${new Date(estadisticas.proximo_pago.fecha_pago).toLocaleDateString('es-MX')}`
        : 'Al corriente',
      changeType: estadisticas.proximo_pago ? ('negative' as const) : ('positive' as const),
      changeLabel: '',
    },
    {
      title: 'Lote Asignado',
      value: ventaActiva?.lote_id.numero_lote || 'N/A',
      change: ventaActiva ? `Manzana ${ventaActiva.lote_id.manzana}` : 'Sin asignar',
      changeType: 'neutral' as const,
      changeLabel: '',
    },
  ];

  // Map payments to TablaAmortizacion format
  let amortizacionData: FilaAmortizacion[] = [];
  if (ventaActiva && Array.isArray(ventaActiva.pagos)) {
    // Sort by payment date or number safely
    const sortedPagos = [...ventaActiva.pagos].sort((a, b) => {
      const dateA = a.fecha_pago ? new Date(a.fecha_pago).getTime() : 0;
      const dateB = b.fecha_pago ? new Date(b.fecha_pago).getTime() : 0;
      return dateA - dateB;
    });

    amortizacionData = sortedPagos.map((pago, index) => ({
      numero_pago: pago.numero_parcialidad || index + 1,
      fecha_vencimiento: pago.fecha_pago || '', // Handle missing date
      cuota: Number(pago.monto || 0),
      interes: Number(pago.interes || 0),
      capital: Number(pago.capital || pago.monto || 0), // Default to full amount if not split
      saldo_restante: Number(pago.saldo_restante || 0),
      estatus: pago.estatus,
    }));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mi Portal</h1>
          <p className="text-slate-400 mt-1">Bienvenido, {perfil.nombre}</p>
        </div>
        {ventaActiva && (
          <div className="bg-emerald-900/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium border border-emerald-800 self-start md:self-auto">
            Contrato #{ventaActiva.id} - {ventaActiva.estatus.toUpperCase()}
          </div>
        )}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de Amortización */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Estado de Cuenta</h2>
            {amortizacionData.length > 0 ? (
              <TablaAmortizacion amortizacion={amortizacionData} />
            ) : (
              <div className="text-slate-400 py-8 text-center bg-slate-800/50 rounded-lg">
                No hay información de pagos disponible.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Documentos */}
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Documentos</h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-200">
                    Contrato de Compraventa
                  </span>
                </div>
                <span className="text-xs text-slate-400">PDF</span>
              </li>
              <li className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-200">Reglamento Interno</span>
                </div>
                <span className="text-xs text-slate-400">PDF</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Mis Datos</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs uppercase mb-1">Nombre</label>
                <div className="font-medium text-slate-200">{perfil.nombre}</div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs uppercase mb-1">Email</label>
                <div className="font-medium text-slate-200">{perfil.email}</div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs uppercase mb-1">Teléfono</label>
                <div className="font-medium text-slate-200">{perfil.telefono}</div>
              </div>
              {/* <button className="w-full py-2 mt-2 border border-slate-600 rounded hover:bg-slate-700 text-slate-300 transition-colors">
                Editar Información
              </button> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

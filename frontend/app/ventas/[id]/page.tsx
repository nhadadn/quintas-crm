'use client';

import React, { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { getVentaById } from '@/lib/ventas-api';
import { fetchPagos, fetchMovimientos } from '@/lib/pagos-api';
import { Venta, Pago, MovimientoPago } from '@/types/erp';
import { format } from 'date-fns';
import TablaPagos from '@/components/gestion/TablaPagos';
import { TablaAmortizacion } from '@/components/pagos/TablaAmortizacion';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DetalleVentaPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movs, setMovs] = useState<MovimientoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'detalle' | 'pagos' | 'amortizacion'>('detalle');

  useEffect(() => {
    if (!id) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const ventaData = await getVentaById(id);
        setVenta(ventaData);

        const pagosData = await fetchPagos(
          { filter: { venta_id: { _eq: id } } },
          session?.accessToken || undefined,
        );
        setPagos(pagosData);
        const movsData = await fetchMovimientos(
          { filter: { venta_id: { _eq: id } }, sort: ['-fecha_movimiento'] },
          session?.accessToken || undefined,
        );
        setMovs(movsData);
      } catch (error) {
        console.error('Error cargando datos de venta:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [id, session?.accessToken]);

  if (loading) {
    return <div className="p-6 text-center">Cargando detalles de venta...</div>;
  }

  if (!venta) {
    return <div className="p-6 text-center text-red-600">Venta no encontrada</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const isPostProcessOk = venta.post_process_status === 'ok';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {!isPostProcessOk && (
        <div className={`mb-4 p-4 rounded ${venta.post_process_status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
          <div className="font-semibold">
            Estado de post-proceso: {venta.post_process_status?.toUpperCase() || 'PENDING'}
          </div>
          {venta.post_process_error && (
            <div className="mt-1 text-sm">Detalle: {String(venta.post_process_error)}</div>
          )}
          <div className="mt-2 text-xs text-gray-500">
            Mientras el post-proceso no esté OK, las acciones de pagos se encuentran bloqueadas.
          </div>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/ventas" className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
            &larr; Volver a Ventas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Venta #{String(venta.id).substring(0, 8)}
          </h1>
          <p className="text-gray-500">
            Fecha: {formatDate(venta.fecha_venta)} | Estatus:{' '}
            <span className="uppercase font-semibold">{venta.estatus}</span>
          </p>
        </div>
        <div className="space-x-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Editar Venta
          </button>
          {venta.estatus === 'apartado' && (
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Generar Contrato
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('detalle')}
            className={`${
              activeTab === 'detalle'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Detalles Generales
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`${
              activeTab === 'pagos'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            disabled={!isPostProcessOk}
          >
            Historial de Pagos
          </button>
          <button
            onClick={() => setActiveTab('amortizacion')}
            className={`${
              activeTab === 'amortizacion'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Tabla de Amortización
          </button>
        </nav>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'detalle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Nombre Completo</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.cliente_id === 'object'
                    ? `${venta.cliente_id.nombre} ${venta.cliente_id.apellido_paterno} ${venta.cliente_id.apellido_materno || ''}`
                    : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.cliente_id === 'object' ? venta.cliente_id.email : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.cliente_id === 'object' ? venta.cliente_id.telefono : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Lote</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Lote</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.lote_id === 'object'
                    ? (venta.lote_id.identificador ||
                       // Fallbacks para variantes de naming
                       venta.lote_id.numero_lote ||
                       venta.lote_id.lote ||
                       venta.lote_id.clave ||
                       venta.lote_id.nombre ||
                       'N/D')
                    : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Zona</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.lote_id === 'object' ? venta.lote_id.zona : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Precio Lista</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.lote_id === 'object' && venta.lote_id.precio_lista
                    ? formatCurrency(venta.lote_id.precio_lista)
                    : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Área</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeof venta.lote_id === 'object' ? `${venta.lote_id.area_m2} m²` : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Términos de Venta</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Monto Total</dt>
                <dd className="mt-1 text-lg font-semibold text-indigo-600">
                  {formatCurrency(venta.monto_total)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Enganche</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatCurrency(venta.enganche)}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Plazo</dt>
                <dd className="mt-1 text-sm text-gray-900">{venta.plazo_meses} meses</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Tasa Interés</dt>
                <dd className="mt-1 text-sm text-gray-900">{venta.tasa_interes}% Anual</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'pagos' && isPostProcessOk && (
        <div className="space-y-8">
          <TablaPagos
            pagos={pagos}
            onVerDetalles={(pagoId) => console.log('Ver pago', pagoId)}
            onGenerarRecibo={(pagoId) => console.log('Generar recibo', pagoId)}
          />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Movimientos manuales</h3>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Cuota</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estatus</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sin movimientos</td>
                    </tr>
                  ) : (
                    movs.map((m) => (
                      <tr key={String(m.id)}>
                        <td className="px-4 py-2 text-sm">{String(m.fecha_movimiento).slice(0,10)}</td>
                        <td className="px-4 py-2 text-sm">{m.numero_pago}</td>
                        <td className="px-4 py-2 text-sm">${Number(m.monto).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm">{m.estatus}</td>
                        <td className="px-4 py-2 text-sm max-w-xs truncate">{m.notas || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'amortizacion' && <TablaAmortizacion venta_id={String(venta.id)} />}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { getVentaById } from '@/lib/ventas-api';
import { fetchPagos } from '@/lib/pagos-api';
import { Venta, Pago } from '@/types/erp';
import { format } from 'date-fns';
import TablaPagos from '@/components/gestion/TablaPagos';
import { TablaAmortizacion } from '@/components/pagos/TablaAmortizacion';
import Link from 'next/link';

interface PageProps {
  params: {
    id: string;
  };
}

export default function DetalleVentaPage({ params }: PageProps) {
  const { id } = params;
  const [venta, setVenta] = useState<Venta | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'detalle' | 'pagos' | 'amortizacion'>('detalle');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const ventaData = await getVentaById(id);
        setVenta(ventaData);

        // Cargar pagos asociados
        const pagosData = await fetchPagos();
        // Filtrar pagos de esta venta (idealmente el API debería soportar filtro por venta_id)
        const pagosVenta = pagosData.filter(p => 
          typeof p.venta_id === 'object' ? p.venta_id.id === id : p.venta_id === id
        );
        setPagos(pagosVenta);
      } catch (error) {
        console.error('Error cargando datos de venta:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [id]);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/ventas" className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
            &larr; Volver a Ventas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Venta #{String(venta.id).substring(0, 8)}
          </h1>
          <p className="text-gray-500">
            Fecha: {formatDate(venta.fecha_venta)} | Estatus: <span className="uppercase font-semibold">{venta.estatus}</span>
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
                  {typeof venta.lote_id === 'object' ? venta.lote_id.identificador : 'N/A'}
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
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(venta.enganche)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Plazo</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {venta.plazo_meses} meses
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Tasa Interés</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {venta.tasa_interes}% Anual
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'pagos' && (
        <TablaPagos
          pagos={pagos}
          onVerDetalles={(pagoId) => console.log('Ver pago', pagoId)}
          onGenerarRecibo={(pagoId) => console.log('Generar recibo', pagoId)}
        />
      )}

      {activeTab === 'amortizacion' && (
        <TablaAmortizacion venta_id={String(venta.id)} />
      )}
    </div>
  );
}

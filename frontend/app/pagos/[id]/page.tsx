'use client';

import React, { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { getPagoById } from '@/lib/pagos-api';
import { Pago } from '@/types/erp';
import { format } from 'date-fns';
import GeneradorRecibos from '@/components/pagos/GeneradorRecibos';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper functions for safe property access
const getVentaId = (ventaId: Pago['venta_id'] | null | undefined): string => {
  if (!ventaId) return '#';
  if (typeof ventaId === 'object') return String(ventaId.id);
  return String(ventaId);
};

const getVentaDisplay = (ventaId: Pago['venta_id'] | null | undefined): string => {
  if (!ventaId) return 'N/A';
  if (typeof ventaId === 'object') return String(ventaId.id).substring(0, 8);
  return String(ventaId);
};

const getClienteNombre = (ventaId: Pago['venta_id'] | null | undefined): string => {
  if (!ventaId || typeof ventaId !== 'object' || !ventaId.cliente_id) return 'N/A';
  
  const cliente = ventaId.cliente_id;
  if (typeof cliente === 'object') {
    return `${cliente.nombre} ${cliente.apellido_paterno}`;
  }
  return 'N/A'; // If cliente_id is just an ID, we can't show name
};

const getLoteIdentificador = (ventaId: Pago['venta_id'] | null | undefined): string => {
  if (!ventaId || typeof ventaId !== 'object' || !ventaId.lote_id) return 'N/A';
  
  const lote = ventaId.lote_id;
  if (typeof lote === 'object') {
    return lote.identificador;
  }
  return 'N/A'; // If lote_id is just an ID, we can't show identifier
};

export default function DetallePagoPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const [pago, setPago] = useState<Pago | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      // Opcional: Redirigir o mostrar error
      setLoading(false);
      return;
    }

    const cargarPago = async () => {
      setLoading(true);
      try {
        const data = await getPagoById(id, session?.accessToken);
        setPago(data);
      } catch (error) {
        console.error('Error cargando pago:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarPago();
  }, [id, status, session]);

  const handleMarcarPagado = () => {
    // Implementar lógica
    alert('Funcionalidad para marcar como pagado pendiente');
  };

  const handleEditarPago = () => {
    // Implementar lógica
    alert('Funcionalidad de edición pendiente');
  };

  if (loading) {
    return <div className="p-6 text-center">Cargando detalle del pago...</div>;
  }

  if (!pago) {
    return <div className="p-6 text-center text-red-600">Pago no encontrado</div>;
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
      <div className="mb-6">
        <Link href="/pagos" className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
          &larr; Volver a Pagos
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pago #{pago.numero_pago}</h1>
            <p className="text-gray-500">Vencimiento: {formatDate(pago.fecha_vencimiento)}</p>
          </div>
          <div className="flex space-x-3">
            {pago.estatus === 'pendiente' && (
              <>
                <button
                  onClick={handleEditarPago}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Editar Pago
                </button>
                <button
                  onClick={handleMarcarPagado}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Marcar como Pagado
                </button>
              </>
            )}
            {pago.estatus === 'pagado' && <GeneradorRecibos pago={pago} />}
            <span
              className={`px-4 py-2 rounded-full font-bold text-white capitalize
              ${
                pago.estatus === 'pagado'
                  ? 'bg-green-500'
                  : pago.estatus === 'atrasado'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            >
              {pago.estatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalles del Pago */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detalles del Pago</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Monto</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(pago.monto)}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Mora / Recargos</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatCurrency(pago.mora || 0)}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Monto Pagado</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatCurrency(pago.monto_pagado || 0)}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Referencia</dt>
              <dd className="mt-1 text-sm text-gray-900">{pago.referencia || 'N/A'}</dd>
            </div>
          </dl>
        </div>

        {/* Generador de Recibos */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Comprobante de Pago</h3>
          {pago.estatus === 'pagado' ? (
            <GeneradorRecibos pago={pago} />
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
              <p>El recibo estará disponible una vez que el pago sea liquidado.</p>
            </div>
          )}
        </div>

        {/* Información Relacionada */}
        <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Venta</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Venta ID</dt>
              <dd className="mt-1 text-sm text-indigo-600 hover:text-indigo-800">
                {pago.venta_id ? (
                  <Link href={`/ventas/${getVentaId(pago.venta_id)}`}>
                    {getVentaDisplay(pago.venta_id)}
                  </Link>
                ) : (
                  <span className="text-gray-400">No asignada</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Cliente</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getClienteNombre(pago.venta_id)}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Lote</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getLoteIdentificador(pago.venta_id)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

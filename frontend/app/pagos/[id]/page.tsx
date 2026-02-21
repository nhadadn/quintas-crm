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

const getStatusClasses = (estatus: Pago['estatus'] | null | undefined): string => {
  const value = (estatus || '').toLowerCase();

  if (value === 'pagado') return 'bg-success/10 text-success border-success/40';
  if (value === 'atrasado' || value === 'vencido')
    return 'bg-danger/10 text-danger border-danger/40';

  return 'bg-warning/10 text-warning border-warning/40';
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
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Cargando detalle del pago...</div>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-sm text-danger">Pago no encontrado</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/pagos"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Volver a Pagos</span>
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
                Pago #{pago.numero_pago}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Vencimiento: {formatDate(pago.fecha_vencimiento)}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              {pago.estatus === 'pendiente' && (
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    onClick={handleEditarPago}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-background border border-border text-sm font-medium text-muted-foreground hover:bg-background-subtle transition-colors"
                  >
                    Editar pago
                  </button>
                  <button
                    onClick={handleMarcarPagado}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-warm hover:bg-primary-dark hover:shadow-warm-hover transition-colors"
                  >
                    Marcar como pagado
                  </button>
                </div>
              )}

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClasses(pago.estatus)}`}
              >
                {pago.estatus?.toUpperCase() || 'DESCONOCIDO'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card shadow-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Detalles del Pago</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Monto
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-text-primary">
                  {formatCurrency(pago.monto)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Mora / Recargos
                </dt>
                <dd className="mt-1 text-sm text-foreground">{formatCurrency(pago.mora || 0)}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Monto Pagado
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCurrency(pago.monto_pagado || 0)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Referencia
                </dt>
                <dd className="mt-1 text-sm text-foreground">{pago.referencia || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card shadow-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Comprobante de Pago</h3>
            {pago.estatus === 'pagado' ? (
              <GeneradorRecibos pago={pago} />
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground bg-background-subtle rounded-xl border border-dashed border-border">
                <p>El recibo estará disponible una vez que el pago sea liquidado.</p>
              </div>
            )}
          </div>

          <div className="bg-card shadow-card border border-border rounded-2xl p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">Información de Venta</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Venta ID
                </dt>
                <dd className="mt-1 text-sm">
                  {pago.venta_id ? (
                    <Link
                      href={`/ventas/${getVentaId(pago.venta_id)}`}
                      className="text-primary-light hover:text-primary"
                    >
                      {getVentaDisplay(pago.venta_id)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No asignada</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Cliente
                </dt>
                <dd className="mt-1 text-sm text-foreground">{getClienteNombre(pago.venta_id)}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Lote
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {getLoteIdentificador(pago.venta_id)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

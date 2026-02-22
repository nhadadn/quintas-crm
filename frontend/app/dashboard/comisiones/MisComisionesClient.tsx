'use client';

import type { Comision, Vendedor } from '@/types/erp';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { formatCurrencyMXN } from '@/lib/utils';

interface MisComisionesClientProps {
  vendedor: Vendedor & { fechaRegistro?: string | null };
  comisiones: Comision[];
  kpis: {
    total: number;
    pagadas: number;
    pendientes: number;
  };
}

function getStatusBadgeClass(estatus: string) {
  if (estatus === 'pagada') {
    return 'bg-success/10 text-success rounded-full px-3 py-1 text-xs font-medium';
  }
  if (estatus === 'pendiente') {
    return 'bg-warning/10 text-warning rounded-full px-3 py-1 text-xs font-medium';
  }
  if (estatus === 'cancelada') {
    return 'bg-danger/10 text-danger rounded-full px-3 py-1 text-xs font-medium';
  }
  return 'bg-muted/20 text-muted-foreground rounded-full px-3 py-1 text-xs font-medium';
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function MisComisionesClient({ vendedor, comisiones, kpis }: MisComisionesClientProps) {
  const fechaRegistro = vendedor.fechaRegistro || vendedor.created_at || vendedor.date_created;

  const rows = comisiones.map((c) => {
    const venta = c.venta_id as any;
    const ventaId = typeof c.venta_id === 'object' ? venta.id : c.venta_id;

    const loteRaw = venta?.lote_id;
    const loteNumero =
      typeof loteRaw === 'object'
        ? loteRaw.numero_lote || loteRaw.identificador || loteRaw.id
        : loteRaw;
    const manzana = typeof loteRaw === 'object' ? loteRaw.manzana : undefined;
    const loteLabel = loteNumero
      ? `${loteNumero}${manzana ? ` · Mz. ${manzana}` : ''}`
      : 'Sin lote';

    const clienteRaw = venta?.cliente_id;
    const clienteNombre =
      typeof clienteRaw === 'object'
        ? [clienteRaw.nombre, clienteRaw.apellido_paterno, clienteRaw.apellido_materno]
            .filter(Boolean)
            .join(' ')
        : undefined;

    return {
      id: c.id,
      ventaId,
      lote: loteLabel,
      cliente: clienteNombre || 'Cliente no disponible',
      monto: c.monto_comision,
      estatus: c.estatus,
      fechaEstimada: c.fecha_pago_programada || null,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="w-12 h-1 rounded-full bg-accent/60 mb-4" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mis Comisiones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detalle de comisiones generadas por tus ventas cerradas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border flex flex-col gap-4 lg:col-span-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Vendedor
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">
              {vendedor.nombre} {vendedor.apellido_paterno}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              ID Vendedor
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">{vendedor.id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Email
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">{vendedor.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Fecha de registro
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">
              {formatFecha(fechaRegistro)}
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl shadow-card p-5 border border-border">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Total Generado
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {formatCurrencyMXN(kpis.total)}
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-5 border border-border">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Comisiones Pagadas
            </p>
            <p className="mt-2 text-xl font-semibold text-success">
              {formatCurrencyMXN(kpis.pagadas)}
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-5 border border-border">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Comisiones Pendientes
            </p>
            <p className="mt-2 text-xl font-semibold text-warning">
              {formatCurrencyMXN(kpis.pendientes)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Comisiones por Venta
          </h2>
          <p className="text-xs text-muted-foreground">
            {comisiones.length} registros
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-4xl">💼</div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Aún no tienes comisiones registradas.
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Cuando cierres tus primeras ventas, verás aquí el detalle de las comisiones generadas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-background-paper">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    # Venta
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Lote
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Cliente
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Monto
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Estatus
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Fecha Est. de Pago
                    <InfoTooltip content="Fecha estimada en que se libera la comisión según el plan de pagos de la venta." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-4 px-6 text-sm text-foreground">
                      {String(row.ventaId).substring(0, 8)}
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground">{row.lote}</td>
                    <td className="py-4 px-6 text-sm text-foreground">{row.cliente}</td>
                    <td className="py-4 px-6 text-sm text-foreground">
                      {formatCurrencyMXN(row.monto)}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <span className={getStatusBadgeClass(row.estatus)}>{row.estatus}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground">
                      {formatFecha(row.fechaEstimada)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


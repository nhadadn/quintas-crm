'use client';

import React, { useState, useMemo } from 'react';
import { Pago, EstatusPago } from '@/types/erp';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { format } from 'date-fns';

interface TablaPagosProps {
  pagos: Pago[];
  isLoading?: boolean;
  onVerDetalles: (id: string | number) => void;
  onMarcarPagado?: (id: string | number) => void;
  onGenerarRecibo?: (id: string | number) => void;
}

const TablaPagos: React.FC<TablaPagosProps> = ({
  pagos,
  isLoading = false,
  onVerDetalles,
  onMarcarPagado,
  onGenerarRecibo,
}) => {
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusPago | ''>('');
  const [filtroVenta, setFiltroVenta] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [ordenColumna, setOrdenColumna] = useState<keyof Pago>('fecha_vencimiento');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc');

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const pagosFiltrados = useMemo(() => {
    return pagos
      .filter((pago) => {
        const matchEstatus = filtroEstatus ? pago.estatus === filtroEstatus : true;

        const ventaIdentificador =
          pago.venta_id && typeof pago.venta_id === 'object'
            ? String(pago.venta_id.id) // O cliente asociado si se prefiere
            : String(pago.venta_id || '');
        const matchVenta = filtroVenta ? ventaIdentificador.includes(filtroVenta) : true;

        const matchFecha = filtroFecha ? pago.fecha_vencimiento.startsWith(filtroFecha) : true;

        return matchEstatus && matchVenta && matchFecha;
      })
      .sort((a, b) => {
        let valorA: any = a[ordenColumna];
        let valorB: any = b[ordenColumna];

        if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
        return 0;
      });
  }, [pagos, filtroEstatus, filtroVenta, filtroFecha, ordenColumna, ordenDireccion]);

  const totalPaginas = Math.ceil(pagosFiltrados.length / itemsPorPagina);
  const pagosPaginados = pagosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );

  const handleSort = (columna: keyof Pago) => {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenColumna(columna);
      setOrdenDireccion('asc');
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 w-full shadow-card">
      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Estatus
          </label>
          <select
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value as EstatusPago)}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            ID Venta
          </label>
          <input
            type="text"
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Buscar por ID venta..."
            value={filtroVenta}
            onChange={(e) => setFiltroVenta(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Vencimiento
          </label>
          <input
            type="date"
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full bg-background border border-border text-sm font-medium text-muted-foreground rounded-xl py-2 px-4 hover:bg-background-subtle transition-colors"
            onClick={() => {
              setFiltroEstatus('');
              setFiltroVenta('');
              setFiltroFecha('');
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm text-left text-muted-foreground">
          <thead className="bg-background-paper text-foreground uppercase font-medium">
            <tr>
              {['venta_id', 'numero_pago', 'fecha_vencimiento', 'monto'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                  onClick={() => handleSort(col as keyof Pago)}
                >
                  {col.replace('_', ' ').toUpperCase()}
                  {ordenColumna === col && (
                    <span className="ml-1">{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('estatus')}
              >
                ESTATUS
                <InfoTooltip content="Estado actual del pago dentro del plan de cobranza de la venta." />
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-medium tracking-widest text-muted-foreground"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : pagosPaginados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron pagos
                </td>
              </tr>
            ) : (
              pagosPaginados.map((pago) => (
                <tr key={pago.id} className="hover:bg-background-subtle transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {(() => {
                      if (!pago.venta_id) return 'N/A';
                      const ventaId =
                        typeof pago.venta_id === 'object' && pago.venta_id !== null
                          ? (pago.venta_id as any).id
                          : pago.venta_id;
                      return ventaId ? String(ventaId).substring(0, 8) + '...' : 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    #{pago.numero_pago}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(pago.fecha_vencimiento)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                    {formatCurrency(pago.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                      ${
                        pago.estatus === 'pagado'
                          ? 'bg-success/10 text-success border-success/40'
                          : pago.estatus === 'atrasado'
                            ? 'bg-danger/10 text-danger border-danger/40'
                            : 'bg-warning/10 text-warning border-warning/40'
                      }`}
                    >
                      {pago.estatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(pago.id)}
                      className="text-primary-light hover:text-primary transition-colors mr-3"
                    >
                      Ver
                    </button>
                    {onMarcarPagado && pago.estatus !== 'pagado' && (
                      <button
                        onClick={() => onMarcarPagado(pago.id)}
                        className="text-success hover:text-success/80 transition-colors mr-3"
                      >
                        Pagar
                      </button>
                    )}
                    {onGenerarRecibo && pago.estatus === 'pagado' && (
                      <button
                        onClick={() => onGenerarRecibo(pago.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Recibo
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación Simplificada */}
      <div className="py-3 flex items-center justify-between border-t border-border mt-4">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-muted-foreground bg-background hover:bg-background-subtle disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-muted-foreground bg-background hover:bg-background-subtle disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Mostrando {(paginaActual - 1) * itemsPorPagina + 1} a{' '}
              {Math.min(paginaActual * itemsPorPagina, pagosFiltrados.length)} de{' '}
              {pagosFiltrados.length}
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-xl shadow-sm overflow-hidden">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              // Lógica simple para mostrar paginación cercana
              let p = i + 1;
              if (totalPaginas > 5 && paginaActual > 3) p = paginaActual - 2 + i;
              if (p > totalPaginas) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPaginaActual(p)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    paginaActual === p
                      ? 'z-10 bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground hover:bg-background-subtle'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default TablaPagos;

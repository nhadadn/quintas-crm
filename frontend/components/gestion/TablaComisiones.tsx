'use client';

import React, { useState, useMemo } from 'react';
import { Comision, EstatusComision, TipoComision } from '@/types/erp';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { format } from 'date-fns';

interface TablaComisionesProps {
  comisiones: Comision[];
  isLoading?: boolean;
  onVerDetalles: (id: string | number) => void;
  onMarcarPagada?: (id: string | number) => void;
}

const TablaComisiones: React.FC<TablaComisionesProps> = ({
  comisiones,
  isLoading = false,
  onVerDetalles,
  onMarcarPagada,
}) => {
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusComision | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<TipoComision | ''>('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  const [ordenColumna, setOrdenColumna] = useState<keyof Comision>('fecha_pago_programada');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc');

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const comisionesFiltradas = useMemo(() => {
    return comisiones
      .filter((c) => {
        const matchEstatus = filtroEstatus ? c.estatus === filtroEstatus : true;
        const matchTipo = filtroTipo ? c.tipo_comision === filtroTipo : true;

        const nombreVendedor =
          typeof c.vendedor_id === 'object'
            ? `${c.vendedor_id.nombre} ${c.vendedor_id.apellido_paterno}`.toLowerCase()
            : '';
        const matchVendedor = filtroVendedor
          ? nombreVendedor.includes(filtroVendedor.toLowerCase())
          : true;

        return matchEstatus && matchTipo && matchVendedor;
      })
      .sort((a, b) => {
        let valorA: any = a[ordenColumna];
        let valorB: any = b[ordenColumna];

        if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
        return 0;
      });
  }, [comisiones, filtroEstatus, filtroTipo, filtroVendedor, ordenColumna, ordenDireccion]);

  const totalPaginas = Math.ceil(comisionesFiltradas.length / itemsPorPagina);
  const comisionesPaginadas = comisionesFiltradas.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );

  const handleSort = (columna: keyof Comision) => {
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
            onChange={(e) => setFiltroEstatus(e.target.value as EstatusComision)}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tipo Comisión
          </label>
          <select
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoComision)}
          >
            <option value="">Todos</option>
            <option value="enganche">Enganche</option>
            <option value="contrato">Contrato</option>
            <option value="liquidacion">Liquidación</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Vendedor
          </label>
          <input
            type="text"
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Buscar vendedor..."
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full bg-background border border-border text-sm font-medium text-muted-foreground rounded-xl py-2 px-4 hover:bg-background-subtle transition-colors"
            onClick={() => {
              setFiltroEstatus('');
              setFiltroTipo('');
              setFiltroVendedor('');
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
              {['venta_id', 'vendedor_id', 'tipo_comision', 'monto_comision'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                  onClick={() => handleSort(col as keyof Comision)}
                >
                  {col.replace('_', ' ').replace('id', '').toUpperCase()}
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
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('fecha_pago_programada')}
              >
                FECHA PAGO
                <InfoTooltip content="Fecha estimada en la que se libera la comisión según el plan de pagos de la venta." />
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
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : comisionesPaginadas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron comisiones
                </td>
              </tr>
            ) : (
              comisionesPaginadas.map((c) => (
                <tr key={c.id} className="hover:bg-background-subtle transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof c.venta_id === 'object'
                      ? String(c.venta_id.id).substring(0, 8)
                      : String(c.venta_id).substring(0, 8)}
                    ...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof c.vendedor_id === 'object'
                      ? `${c.vendedor_id.nombre} ${c.vendedor_id.apellido_paterno}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {c.tipo_comision.toUpperCase()} ({c.porcentaje}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                    {formatCurrency(c.monto_comision)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                      ${
                        c.estatus === 'pagada'
                          ? 'bg-success/10 text-success border-success/40'
                          : 'bg-warning/10 text-warning border-warning/40'
                      }`}
                    >
                      {c.estatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(c.fecha_pago_programada)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(c.id)}
                      className="text-primary-light hover:text-primary transition-colors mr-3"
                    >
                      Ver
                    </button>
                    {onMarcarPagada && c.estatus !== 'pagada' && (
                      <button
                        onClick={() => onMarcarPagada(c.id)}
                        className="text-success hover:text-success/80 transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
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
              {Math.min(paginaActual * itemsPorPagina, comisionesFiltradas.length)} de{' '}
              {comisionesFiltradas.length}
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-xl shadow-sm overflow-hidden">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
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

export default TablaComisiones;

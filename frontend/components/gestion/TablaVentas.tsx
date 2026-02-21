'use client';

import React, { useState, useMemo } from 'react';
import { Venta, EstatusVenta } from '@/types/erp';
import { format } from 'date-fns';

interface TablaVentasProps {
  ventas: Venta[];
  isLoading?: boolean;
  onVerDetalles: (id: string | number) => void;
  onEditar?: (id: string | number) => void;
  onGenerarContrato?: (id: string | number) => void;
}

const TablaVentas: React.FC<TablaVentasProps> = ({
  ventas,
  isLoading = false,
  onVerDetalles,
  onEditar,
  onGenerarContrato,
}) => {
  // Estados para filtros y ordenamiento
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusVenta | ''>('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [ordenColumna, setOrdenColumna] = useState<keyof Venta | 'cliente' | 'vendedor'>(
    'fecha_venta',
  );
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Funciones de formato
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Lógica de filtrado y ordenamiento
  const ventasFiltradas = useMemo(() => {
    return ventas
      .filter((venta) => {
        const matchEstatus = filtroEstatus ? venta.estatus === filtroEstatus : true;

        const nombreVendedor =
          typeof venta.vendedor_id === 'object'
            ? `${venta.vendedor_id.nombre} ${venta.vendedor_id.apellido_paterno}`.toLowerCase()
            : '';
        const matchVendedor = filtroVendedor
          ? nombreVendedor.includes(filtroVendedor.toLowerCase())
          : true;

        const matchFecha = filtroFecha ? venta.fecha_venta.startsWith(filtroFecha) : true;

        return matchEstatus && matchVendedor && matchFecha;
      })
      .sort((a, b) => {
        let valorA: any = a[ordenColumna as keyof Venta];
        let valorB: any = b[ordenColumna as keyof Venta];

        // Manejo especial para objetos anidados (simulado)
        if (ordenColumna === 'cliente' && typeof a.cliente_id === 'object') {
          valorA = a.cliente_id.nombre;
          valorB = (b.cliente_id as any).nombre;
        }
        if (ordenColumna === 'vendedor' && typeof a.vendedor_id === 'object') {
          valorA = a.vendedor_id.nombre;
          valorB = (b.vendedor_id as any).nombre;
        }

        if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
        return 0;
      });
  }, [ventas, filtroEstatus, filtroVendedor, filtroFecha, ordenColumna, ordenDireccion]);

  // Paginación
  const totalPaginas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const ventasPaginadas = ventasFiltradas.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina,
  );

  const handleSort = (columna: keyof Venta | 'cliente' | 'vendedor') => {
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
            onChange={(e) => setFiltroEstatus(e.target.value as EstatusVenta)}
          >
            <option value="">Todos</option>
            <option value="apartado">Apartado</option>
            <option value="contrato">Contrato</option>
            <option value="pagos">Pagos</option>
            <option value="liquidado">Liquidado</option>
            <option value="cancelada">Cancelada</option>
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
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Fecha Venta
          </label>
          <input
            type="date"
            className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full bg-background border border-border text-sm font-medium text-muted-foreground rounded-xl py-2 px-4 hover:bg-background-subtle transition-colors"
            onClick={() => {
              setFiltroEstatus('');
              setFiltroVendedor('');
              setFiltroFecha('');
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-muted-foreground">
          <thead className="bg-background-paper text-foreground uppercase font-medium">
            <tr>
              {['fecha_venta', 'cliente', 'vendedor', 'lote_id', 'monto_total', 'estatus'].map(
                (col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                    onClick={() => handleSort(col as any)}
                  >
                    {col.replace('_', ' ').toUpperCase()}
                    {ordenColumna === col && (
                      <span className="ml-1">{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ),
              )}
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
            ) : ventasPaginadas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron ventas
                </td>
              </tr>
            ) : (
              ventasPaginadas.map((venta) => (
                <tr key={venta.id} className="hover:bg-background-subtle transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {formatDate(venta.fecha_venta)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof venta.cliente_id === 'object' && venta.cliente_id !== null
                      ? `${(venta.cliente_id as any).nombre} ${(venta.cliente_id as any).apellido_paterno}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof venta.vendedor_id === 'object' && venta.vendedor_id !== null
                      ? `${(venta.vendedor_id as any).nombre} ${(venta.vendedor_id as any).apellido_paterno}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof venta.lote_id === 'object' && venta.lote_id !== null
                      ? (venta.lote_id as any).identificador
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                    {formatCurrency(venta.monto_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                      ${
                        venta.estatus === 'liquidado'
                          ? 'bg-success/10 text-success border-success/40'
                          : venta.estatus === 'cancelada'
                            ? 'bg-danger/10 text-danger border-danger/40'
                            : venta.estatus === 'apartado'
                              ? 'bg-warning/10 text-warning border-warning/40'
                              : 'bg-muted/20 text-muted-foreground border-muted'
                      }`}
                    >
                      {venta.estatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(venta.id)}
                      className="text-primary-light hover:text-primary transition-colors mr-3"
                    >
                      Ver
                    </button>
                    {onEditar && (
                      <button
                        onClick={() => onEditar(venta.id)}
                        className="text-secondary hover:text-secondary-dark transition-colors mr-3"
                      >
                        Editar
                      </button>
                    )}
                    {onGenerarContrato && venta.estatus === 'apartado' && (
                      <button
                        onClick={() => onGenerarContrato(venta.id)}
                        className="text-success hover:text-success/80 transition-colors"
                      >
                        Contrato
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
              Mostrando{' '}
              <span className="font-medium">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{' '}
              <span className="font-medium">
                {Math.min(paginaActual * itemsPorPagina, ventasFiltradas.length)}
              </span>{' '}
              de <span className="font-medium">{ventasFiltradas.length}</span> resultados
            </p>
          </div>
          <div>
            <select
              value={itemsPorPagina}
              onChange={(e) => {
                setItemsPorPagina(Number(e.target.value));
                setPaginaActual(1);
              }}
              className="mr-4 rounded-xl bg-input border border-border px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={10}>10 por pág</option>
              <option value={25}>25 por pág</option>
              <option value={50}>50 por pág</option>
            </select>
            <nav className="relative z-0 inline-flex rounded-xl shadow-sm overflow-hidden" aria-label="Pagination">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setPaginaActual(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                    ${
                      paginaActual === page
                        ? 'z-10 bg-primary/10 border-primary text-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-background-subtle'
                    }`}
                >
                  {page}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablaVentas;

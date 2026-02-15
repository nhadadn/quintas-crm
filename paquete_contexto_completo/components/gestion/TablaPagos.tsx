'use client';

import React, { useState, useMemo } from 'react';
import { Pago, EstatusPago } from '@/types/erp';
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
    <div className="bg-white shadow rounded-lg p-4 w-full">
      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estatus</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
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
          <label className="block text-sm font-medium text-gray-700">ID Venta</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Buscar por ID venta..."
            value={filtroVenta}
            onChange={(e) => setFiltroVenta(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Vencimiento</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['venta_id', 'numero_pago', 'fecha_vencimiento', 'monto', 'estatus'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : pagosPaginados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron pagos
                </td>
              </tr>
            ) : (
              pagosPaginados.map((pago) => (
                <tr key={pago.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(() => {
                      if (!pago.venta_id) return 'N/A';
                      const ventaId =
                        typeof pago.venta_id === 'object' && pago.venta_id !== null
                          ? (pago.venta_id as any).id
                          : pago.venta_id;
                      return ventaId ? String(ventaId).substring(0, 8) + '...' : 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{pago.numero_pago}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(pago.fecha_vencimiento)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(pago.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        pago.estatus === 'pagado'
                          ? 'bg-green-100 text-green-800'
                          : pago.estatus === 'atrasado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {pago.estatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(pago.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Ver
                    </button>
                    {onMarcarPagado && pago.estatus !== 'pagado' && (
                      <button
                        onClick={() => onMarcarPagado(pago.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Pagar
                      </button>
                    )}
                    {onGenerarRecibo && pago.estatus === 'pagado' && (
                      <button
                        onClick={() => onGenerarRecibo(pago.id)}
                        className="text-gray-600 hover:text-gray-900"
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
      <div className="py-3 flex items-center justify-between border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando {(paginaActual - 1) * itemsPorPagina + 1} a{' '}
              {Math.min(paginaActual * itemsPorPagina, pagosFiltrados.length)} de{' '}
              {pagosFiltrados.length}
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              // Lógica simple para mostrar paginación cercana
              let p = i + 1;
              if (totalPaginas > 5 && paginaActual > 3) p = paginaActual - 2 + i;
              if (p > totalPaginas) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPaginaActual(p)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${paginaActual === p ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
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

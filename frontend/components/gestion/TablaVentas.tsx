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
    <div className="bg-white shadow rounded-lg p-4 w-full">
      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estatus</label>
            value={filtroEstatus}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
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
          <label className="block text-sm font-medium text-gray-700">Vendedor</label>
          <input
          <label className="block text-sm font-medium text-gray-700">Vendedor</label>
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha Venta</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          <label className="block text-sm font-medium text-gray-700">Fecha Venta</label>
        </div>
        <div className="flex items-end">
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            onClick={() => {
              setFiltroEstatus('');
              setFiltroVendedor('');
              setFiltroFecha('');
            }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['fecha_venta', 'cliente', 'vendedor', 'lote_id', 'monto_total', 'estatus'].map(
                (col) => (
                  <th
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(col as any)}
                  >
                    {col.replace('_', ' ').toUpperCase()}
                    {ordenColumna === col && (
                      <span className="ml-1">{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  </th>
                ),
              )}
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Cargando...
                </td>
          <tbody className="bg-white divide-y divide-gray-200">
            ) : ventasPaginadas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron ventas
                </td>
              </tr>
            ) : (
              ventasPaginadas.map((venta) => (
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(venta.fecha_venta)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof venta.cliente_id === 'object' && venta.cliente_id !== null
                <tr key={venta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ? `${(venta.vendedor_id as any).nombre} ${(venta.vendedor_id as any).apellido_paterno}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ? (venta.lote_id as any).identificador
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        venta.estatus === 'liquidado'
                          ? 'bg-green-100 text-green-800'
                          : venta.estatus === 'cancelada'
                            ? 'bg-red-100 text-red-800'
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          ? 'bg-green-100 text-green-800'
                    >
                            ? 'bg-red-100 text-red-800'
                    </span>
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                    <button
                      onClick={() => onVerDetalles(venta.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Ver
                    </button>
                    {onEditar && (
                      <button
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                    )}
                    {onGenerarContrato && venta.estatus === 'apartado' && (
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        onClick={() => onGenerarContrato(venta.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Contrato
                      </button>
                    )}
                  </td>
                        className="text-green-600 hover:text-green-900"
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="py-3 flex items-center justify-between border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      <div className="py-3 flex items-center justify-between border-t border-gray-200">
            Anterior
          </button>
          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{' '}
              <span className="font-medium">
                {Math.min(paginaActual * itemsPorPagina, ventasFiltradas.length)}
              </span>{' '}
            <p className="text-sm text-gray-700">
            </p>
          </div>
          <div>
            <select
              value={itemsPorPagina}
              onChange={(e) => {
                setItemsPorPagina(Number(e.target.value));
                setPaginaActual(1);
              }}
              className="mr-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
            >
              <option value={10}>10 por pág</option>
              <option value={25}>25 por pág</option>
              <option value={50}>50 por pág</option>
            </select>
              className="mr-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((page) => (
                <button
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
                  onClick={() => setPaginaActual(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                    ${paginaActual === page ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                >
                  {page}
                    ${paginaActual === page ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
      </div>
    </div>
  );
};

export default TablaVentas;

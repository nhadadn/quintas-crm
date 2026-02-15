'use client';

import React, { useState, useMemo } from 'react';
import { Comision, EstatusComision, TipoComision } from '@/types/erp';
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
    <div className="bg-white shadow rounded-lg p-4 w-full">
      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estatus</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value as EstatusComision)}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo Comisión</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
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
          <label className="block text-sm font-medium text-gray-700">Vendedor</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Buscar vendedor..."
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                'venta_id',
                'vendedor_id',
                'tipo_comision',
                'monto_comision',
                'estatus',
                'fecha_pago_programada',
              ].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : comisionesPaginadas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron comisiones
                </td>
              </tr>
            ) : (
              comisionesPaginadas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof c.venta_id === 'object'
                      ? String(c.venta_id.id).substring(0, 8)
                      : String(c.venta_id).substring(0, 8)}
                    ...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof c.vendedor_id === 'object'
                      ? `${c.vendedor_id.nombre} ${c.vendedor_id.apellido_paterno}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {c.tipo_comision.toUpperCase()} ({c.porcentaje}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(c.monto_comision)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${c.estatus === 'pagada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {c.estatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(c.fecha_pago_programada)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(c.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Ver
                    </button>
                    {onMarcarPagada && c.estatus !== 'pagada' && (
                      <button
                        onClick={() => onMarcarPagada(c.id)}
                        className="text-green-600 hover:text-green-900"
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
      <div className="py-3 flex items-center justify-between border-t border-gray-200">
        {/* ... (misma lógica de paginación que en las otras tablas, se podría abstraer) ... */}
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
              {Math.min(paginaActual * itemsPorPagina, comisionesFiltradas.length)} de{' '}
              {comisionesFiltradas.length}
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
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

export default TablaComisiones;

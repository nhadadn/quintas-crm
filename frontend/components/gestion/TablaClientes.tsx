'use client';

import React, { useState, useMemo } from 'react';
import { Cliente } from '@/types/erp';
import { format } from 'date-fns';

interface TablaClientesProps {
  clientes: Cliente[];
  isLoading?: boolean;
  onVerDetalles: (id: string | number) => void;
  onEditar?: (id: string | number) => void;
}

const TablaClientes: React.FC<TablaClientesProps> = ({ 
  clientes, 
  isLoading = false,
  onVerDetalles,
  onEditar
}) => {
  // Estados para filtros y ordenamiento
  const [filtroTexto, setFiltroTexto] = useState('');
  
  const [ordenColumna, setOrdenColumna] = useState<keyof Cliente>('nombre');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc');

  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Funciones de formato
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Lógica de filtrado y ordenamiento
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => {
      const nombreCompleto = `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.toLowerCase();
      const email = (cliente.email || '').toLowerCase();
      const rfc = (cliente.rfc || '').toLowerCase();
      const search = filtroTexto.toLowerCase();

      return nombreCompleto.includes(search) || email.includes(search) || rfc.includes(search);
    }).sort((a, b) => {
      let valorA: any = a[ordenColumna];
      let valorB: any = b[ordenColumna];

      // Manejo de nulos
      if (valorA === null || valorA === undefined) valorA = '';
      if (valorB === null || valorB === undefined) valorB = '';

      // Comparación string case insensitive
      if (typeof valorA === 'string') valorA = valorA.toLowerCase();
      if (typeof valorB === 'string') valorB = valorB.toLowerCase();

      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clientes, filtroTexto, ordenColumna, ordenDireccion]);

  // Paginación
  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina);
  const clientesPaginados = clientesFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const handleSort = (columna: keyof Cliente) => {
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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Buscar Cliente</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          placeholder="Nombre, Email o RFC..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('nombre')}
              >
                Nombre
                {ordenColumna === 'nombre' && (
                  <span className="ml-1">{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                Email
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('telefono')}
              >
                Teléfono
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('rfc')}
              >
                RFC
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Cargando clientes...
                </td>
              </tr>
            ) : clientesPaginados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              clientesPaginados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cliente.nombre} {cliente.apellido_paterno} {cliente.apellido_materno}
                    </div>
                    <div className="text-sm text-gray-500">
                      Registrado: {formatDate(cliente.date_created)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cliente.rfc || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => onVerDetalles(cliente.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Ver
                    </button>
                    {onEditar && (
                      <button 
                        onClick={() => onEditar(cliente.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Editar
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
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{(paginaActual - 1) * itemsPorPagina + 1}</span> a <span className="font-medium">{Math.min(paginaActual * itemsPorPagina, clientesFiltrados.length)}</span> de <span className="font-medium">{clientesFiltrados.length}</span> resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPaginaActual(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    paginaActual === i + 1
                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablaClientes;

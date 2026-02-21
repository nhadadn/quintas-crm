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
  onEditar,
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
    return clientes
      .filter((cliente) => {
        const nombreCompleto =
          `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.toLowerCase();
        const email = (cliente.email || '').toLowerCase();
        const rfc = (cliente.rfc || '').toLowerCase();
        const search = filtroTexto.toLowerCase();

        return nombreCompleto.includes(search) || email.includes(search) || rfc.includes(search);
      })
      .sort((a, b) => {
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
    paginaActual * itemsPorPagina,
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
    <div className="bg-card border border-border rounded-2xl p-6 w-full shadow-card">
      {/* Filtros */}
      <div className="mb-4">
        <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Buscar Cliente
        </label>
        <input
          type="text"
          className="mt-1 block w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          placeholder="Nombre, Email o RFC..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm text-left text-muted-foreground">
          <thead className="bg-background-paper text-foreground uppercase font-medium">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('nombre')}
              >
                Nombre
                {ordenColumna === 'nombre' && (
                  <span className="ml-1">{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('email')}
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('telefono')}
              >
                Teléfono
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground cursor-pointer hover:bg-background-subtle"
                onClick={() => handleSort('rfc')}
              >
                RFC
              </th>
              <th
                scope="col"
                className="relative px-6 py-4 text-right text-xs font-medium tracking-widest text-muted-foreground"
              >
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-muted-foreground"
                >
                  Cargando clientes...
                </td>
              </tr>
            ) : clientesPaginados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-muted-foreground"
                >
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              clientesPaginados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-background-subtle transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {cliente.nombre} {cliente.apellido_paterno} {cliente.apellido_materno}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Registrado: {formatDate(cliente.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {cliente.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {cliente.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {cliente.rfc || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(cliente.id)}
                      className="text-primary-light hover:text-primary transition-colors mr-4"
                    >
                      Ver
                    </button>
                    {onEditar && (
                      <button
                        onClick={() => onEditar(cliente.id)}
                        className="text-primary-light hover:text-primary transition-colors"
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
      <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6 mt-4">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Mostrando{' '}
              <span className="font-medium">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{' '}
              <span className="font-medium">
                {Math.min(paginaActual * itemsPorPagina, clientesFiltrados.length)}
              </span>{' '}
              de <span className="font-medium">{clientesFiltrados.length}</span> resultados
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-xl shadow-sm overflow-hidden"
              aria-label="Pagination"
            >
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="relative inline-flex items-center px-3 py-2 border border-border text-sm font-medium text-muted-foreground bg-background hover:bg-background-subtle disabled:opacity-50"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPaginaActual(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    paginaActual === i + 1
                      ? 'z-10 bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground hover:bg-background-subtle'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="relative inline-flex items-center px-3 py-2 border border-border text-sm font-medium text-muted-foreground bg-background hover:bg-background-subtle disabled:opacity-50"
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

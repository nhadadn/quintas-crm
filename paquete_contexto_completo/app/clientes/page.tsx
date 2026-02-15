'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TablaClientes from '@/components/gestion/TablaClientes';
import { fetchClientes } from '@/lib/clientes-api';
import { ForbiddenError, UnauthorizedError } from '@/lib/directus-api';
import { Cliente } from '@/types/erp';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GestionClientesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      cargarClientes();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError('No autenticado');
    }
  }, [status, session]);

  const cargarClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchClientes(1, 20, session?.accessToken);
      if (response && response.data) {
        setClientes(response.data);
      }
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
      if (err instanceof ForbiddenError) {
        setError(
          '⛔ Acceso denegado: No tienes permisos para ver el listado de clientes. Verifica tu rol en Directus.',
        );
      } else if (err instanceof UnauthorizedError) {
        setError('⚠️ Sesión no válida o expirada. Por favor verifica tus credenciales.');
      } else {
        setError(`Error al cargar clientes: ${err.message || 'Error desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (id: string | number) => {
    router.push(`/clientes/${id}`);
  };

  const handleEditar = (id: string | number) => {
    // Por ahora redirigimos al detalle, donde se puede editar
    router.push(`/clientes/${id}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra la base de datos de clientes y prospectos.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/clientes/nuevo"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Nuevo Cliente
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error de Carga</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={cargarClientes}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TablaClientes
        clientes={clientes}
        isLoading={loading}
        onVerDetalles={handleVerDetalles}
        onEditar={handleEditar}
      />
    </div>
  );
}

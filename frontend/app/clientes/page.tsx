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
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Gestión de Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra la base de datos de clientes y prospectos.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/clientes/nuevo"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-warm-hover hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
          >
            Nuevo Cliente
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-danger" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-danger">Error de Carga</h3>
              <div className="mt-2 text-sm text-danger/90">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={cargarClientes}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-sm leading-4 font-medium text-danger bg-danger/10 hover:bg-danger/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger/40"
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

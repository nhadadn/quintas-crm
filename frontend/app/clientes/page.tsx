'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TablaClientes from '@/components/gestion/TablaClientes';
import { fetchClientes } from '@/lib/clientes-api';
import { Cliente } from '@/types/erp';
import Link from 'next/link';

export default function GestionClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const response = await fetchClientes();
      if (response && response.data) {
        setClientes(response.data);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
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

      <TablaClientes
        clientes={clientes}
        isLoading={loading}
        onVerDetalles={handleVerDetalles}
        onEditar={handleEditar}
      />
    </div>
  );
}

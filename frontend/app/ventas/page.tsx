'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TablaVentas from '@/components/gestion/TablaVentas';
import { fetchVentas } from '@/lib/ventas-api';
import { Venta } from '@/types/erp';
import Link from 'next/link';

export default function GestionVentasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      cargarVentas();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      // Opcional: Redirigir al login si es una página protegida
      // router.push('/login');
    }
  }, [status, session]);

  const cargarVentas = async () => {
    setLoading(true);
    try {
      const token = session?.accessToken as string | undefined;
      const data = await fetchVentas(token);
      if (data) {
        setVentas(data);
      }
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (id: string | number) => {
    router.push(`/ventas/${id}`);
  };

  const handleEditar = (id: string | number) => {
    // Implementar edición o redirección
    console.log('Editar venta:', id);
    // router.push(`/ventas/${id}/editar`);
  };

  const handleGenerarContrato = (id: string | number) => {
    // Implementar generación de contrato
    console.log('Generar contrato:', id);
    alert('Funcionalidad de contrato pendiente de implementación');
  };

  const handleExportarExcel = () => {
    // Placeholder para exportar a Excel
    console.log('Exportando a Excel...');
    alert('Funcionalidad de exportación a Excel pendiente');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Ventas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra las ventas, contratos y estatus de lotes.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportarExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Exportar Excel
          </button>
          <Link
            href="/ventas/nueva"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Nueva Venta
          </Link>
        </div>
      </div>

      <TablaVentas
        ventas={ventas}
        isLoading={loading}
        onVerDetalles={handleVerDetalles}
        onEditar={handleEditar}
        onGenerarContrato={handleGenerarContrato}
      />
    </div>
  );
}

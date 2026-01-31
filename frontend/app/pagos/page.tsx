'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TablaPagos from '@/components/gestion/TablaPagos';
import { fetchPagos } from '@/lib/pagos-api';
import { Pago } from '@/types/erp';

export default function GestionPagosPage() {
  const router = useRouter();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    setLoading(true);
    try {
      const data = await fetchPagos();
      if (data) {
        setPagos(data);
      }
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (id: string | number) => {
    router.push(`/pagos/${id}`);
  };

  const handleMarcarPagado = (id: string | number) => {
    // Implementar lógica para marcar como pagado
    console.log('Marcar pagado:', id);
    alert('Funcionalidad para marcar como pagado pendiente');
  };

  const handleGenerarRecibo = (id: string | number) => {
    // Redirigir al detalle donde está el generador, o abrir modal
    // Por ahora redirigimos al detalle
    router.push(`/pagos/${id}`);
  };

  const handleRegistrarPago = () => {
    // Implementar modal de registro de pago
    console.log('Registrar nuevo pago');
    alert('Funcionalidad de registro de pago pendiente');
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra los pagos, recibos y estatus de cobranza.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportarExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Exportar Excel
          </button>
          <button
            onClick={handleRegistrarPago}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Registrar Pago
          </button>
        </div>
      </div>

      <TablaPagos
        pagos={pagos}
        isLoading={loading}
        onVerDetalles={handleVerDetalles}
        onMarcarPagado={handleMarcarPagado}
        onGenerarRecibo={handleGenerarRecibo}
      />
    </div>
  );
}

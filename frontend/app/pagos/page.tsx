'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Plus } from 'lucide-react';
import TablaPagos from '@/components/gestion/TablaPagos';
import ModalRegistrarPago from '@/components/pagos/ModalRegistrarPago';
import { fetchPagos, marcarComoPagado, descargarReporteIngresos } from '@/lib/pagos-api';
import { Pago } from '@/types/erp';

export default function GestionPagosPage() {
  const router = useRouter();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      toast.error('Error al cargar la lista de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (id: string | number) => {
    router.push(`/pagos/${id}`);
  };

  const handleMarcarPagado = async (id: string | number) => {
    if (!confirm('¿Estás seguro de marcar este registro como pagado totalmente?')) return;

    try {
      await marcarComoPagado(id);
      toast.success('Pago marcado como completado');
      cargarPagos(); // Recargar lista
    } catch (error: any) {
      console.error('Error al marcar pagado:', error);
      toast.error(error.message || 'Error al actualizar el pago');
    }
  };

  const handleGenerarRecibo = (id: string | number) => {
    router.push(`/pagos/${id}`);
  };

  const handleRegistrarPago = () => {
    setIsModalOpen(true);
  };

  const handleExportarExcel = async () => {
    try {
      toast.loading('Generando reporte...');
      const blob = await descargarReporteIngresos({ formato: 'excel' });
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_ingresos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error exportando Excel:', error);
      toast.dismiss();
      toast.error('Error al descargar el reporte');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Pagos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra los pagos, recibos y estatus de cobranza.
          </p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={handleExportarExcel}
            className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={handleRegistrarPago}
            className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
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

      <ModalRegistrarPago
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={cargarPagos}
      />
    </div>
  );
}

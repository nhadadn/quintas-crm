'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Download, Plus } from 'lucide-react';
import TablaPagos from '@/components/gestion/TablaPagos';
import ModalRegistrarPago from '@/components/pagos/ModalRegistrarPago';
import { fetchPagos, marcarComoPagado, descargarReporteIngresos } from '@/lib/pagos-api';
import { Pago } from '@/types/erp';

export default function GestionPagosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      cargarPagos();
    }
  }, [session]);

  const cargarPagos = async () => {
    setLoading(true);
    try {
      const data = await fetchPagos({}, session?.accessToken);
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
      await marcarComoPagado(id, session?.accessToken);
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
      const blob = await descargarReporteIngresos({ formato: 'excel' }, session?.accessToken);

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
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Gestión de Pagos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra los pagos, recibos y estatus de cobranza.
            </p>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={handleExportarExcel}
              className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground shadow-card hover:shadow-warm-hover hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>
            <button
              onClick={handleRegistrarPago}
              className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:shadow-warm-hover hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background transition-colors"
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
    </div>
  );
}

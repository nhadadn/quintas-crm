'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchRefunds, Reembolso } from '@/lib/reembolsos-api';
import { TablaSolicitudesReembolso } from '@/components/dashboard/TablaSolicitudesReembolso';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardReembolsosPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<Reembolso[]>([]);

  const loadData = async () => {
    if (status === 'loading') return;
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchRefunds({}, session.accessToken);
      setRefunds(data);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast.error('Error al cargar solicitudes de reembolso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session]);

  if (loading && refunds.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando solicitudes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <RotateCcw className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Gestión de Reembolsos
          </h1>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pendientes</p>
          <p className="text-3xl font-bold text-amber-500 mt-2">
            {refunds.filter((r) => r.estado === 'pendiente').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Aprobados (Mes)</p>
          <p className="text-3xl font-bold text-emerald-500 mt-2">
            {refunds.filter((r) => r.estado === 'aprobado' || r.estado === 'procesado').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Rechazados</p>
          <p className="text-3xl font-bold text-rose-500 mt-2">
            {refunds.filter((r) => r.estado === 'rechazado').length}
          </p>
        </div>
      </div>

      <TablaSolicitudesReembolso data={refunds} onUpdate={loadData} />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchKPIs, fetchPagosPorEstatus } from '@/lib/dashboard-api';
import { fetchPagos } from '@/lib/pagos-api';
import { KPICard } from '@/components/dashboard/KPICard';
import { GraficoPagosPorEstatus } from '@/components/dashboard/GraficoPagosPorEstatus';
import { TablaPagosRecientes } from '@/components/dashboard/TablaPagosRecientes';
import { CreditCard, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function DashboardPagosPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [pagosEstatus, setPagosEstatus] = useState<any[]>([]);
  const [pagosRecientes, setPagosRecientes] = useState<any[]>([]);

  const loadData = async () => {
    if (status === 'loading') return;
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = session.accessToken;
      const [kpiData, pagosEstatusData, allPagos] = await Promise.all([
        fetchKPIs(undefined, token),
        fetchPagosPorEstatus(undefined, token),
        fetchPagos({}, token).catch((err) => {
          console.error('Error fetching pagos:', err);
          return [];
        }),
      ]);
      setKpis(kpiData);
      setPagosEstatus(pagosEstatusData);
      setPagosRecientes(allPagos.slice(0, 20)); // Top 20
    } catch (error) {
      console.error(error);
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

  // Periodic refresh
  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [status, session]);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando dashboard de pagos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard de Pagos</h1>
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Pagado"
          value={kpis?.total_pagado || 0}
          prefix="$"
          icon={<CheckCircle className="w-6 h-6 text-emerald-400" />}
        />
        <KPICard
          title="Total Pendiente"
          value={kpis?.total_pendiente || 0}
          prefix="$"
          icon={<Clock className="w-6 h-6 text-amber-400" />}
        />
        <KPICard
          title="% Cobranza"
          value={
            kpis?.total_pagado && kpis?.total_ventas
              ? ((kpis.total_pagado / kpis.total_ventas) * 100).toFixed(1)
              : 0
          }
          suffix="%"
          icon={<CreditCard className="w-6 h-6 text-blue-400" />}
        />
        <KPICard
          title="Pagos Atrasados"
          value={0}
          prefix="$"
          icon={<AlertCircle className="w-6 h-6 text-red-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoPagosPorEstatus data={pagosEstatus} />
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <CreditCard className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">Flujo de Caja Mensual</p>
          <p className="text-slate-500 text-sm mt-2">Próximamente disponible</p>
        </div>
      </div>

      <TablaPagosRecientes data={pagosRecientes} />
    </div>
  );
}

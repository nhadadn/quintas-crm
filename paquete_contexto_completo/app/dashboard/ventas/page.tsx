'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { fetchKPIs, fetchVentasPorMes, fetchVentasRecientes } from '@/lib/dashboard-api';
import { KPICard } from '@/components/dashboard/KPICard';
import { GraficoVentasPorMes } from '@/components/dashboard/GraficoVentasPorMes';
import { RecentSalesTable } from '@/components/dashboard/RecentSalesTable';
import { DollarSign, TrendingUp, ShoppingBag, Map, RefreshCw } from 'lucide-react';

export default function DashboardVentasPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [ventasMes, setVentasMes] = useState<any[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([]);

  const loadData = useCallback(
    async (silent = false) => {
      if (status === 'loading') return;
      if (!session?.accessToken) {
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      try {
        const token = session.accessToken;
        const [kpiData, ventasMesData, ventasRecientesData] = await Promise.all([
          fetchKPIs(undefined, token),
          fetchVentasPorMes(undefined, token),
          fetchVentasRecientes(10, token),
        ]);
        setKpis(kpiData);
        setVentasMes(ventasMesData);
        setVentasRecientes(ventasRecientesData);
      } catch (error) {
        console.error(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [session, status],
  );

  useEffect(() => {
    loadData();

    // Auto-refresh interval (30 seconds)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true); // Silent refresh
      }
    }, 30000);

    // Listen for real-time updates from other tabs
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('dashboard_updates');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_SALE' || event.data?.type === 'REFRESH_DASHBOARD') {
          console.log('🔄 Dashboard Ventas: Actualizando datos por notificación externa');
          loadData(true); // Silent refresh
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or error:', e);
    }

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [loadData]);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando dashboard de ventas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard de Ventas</h1>
        <button
          onClick={() => loadData()}
          className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Ventas Totales"
          value={kpis?.total_ventas || 0}
          prefix="$"
          icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
        />
        <KPICard
          title="Ventas Mes Actual"
          value={kpis?.ventas_mes_actual || 0}
          prefix="$"
          icon={<ShoppingBag className="w-6 h-6 text-blue-400" />}
        />
        <KPICard
          title="Crecimiento"
          value={kpis?.crecimiento_mes_anterior || 0}
          suffix="%"
          trend={kpis?.crecimiento_mes_anterior >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
        />
        <KPICard
          title="Tickets Promedio"
          value={
            kpis?.total_ventas && kpis?.lotes_vendidos_mes
              ? kpis.total_ventas / kpis.lotes_vendidos_mes
              : 0
          }
          prefix="$"
          icon={<Map className="w-6 h-6 text-amber-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoVentasPorMes data={ventasMes} />
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Map className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">Gráfico de Ventas por Zona</p>
          <p className="text-slate-500 text-sm mt-2">Próximamente disponible</p>
        </div>
      </div>

      <RecentSalesTable ventas={ventasRecientes} />
    </div>
  );
}

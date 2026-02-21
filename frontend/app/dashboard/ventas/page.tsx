'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [canRenderChart, setCanRenderChart] = useState(false);

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

  useEffect(() => {
    const el = chartContainerRef.current;
    const check = () => {
      const w = el?.offsetWidth || 0;
      const h = el?.offsetHeight || 0;
      setCanRenderChart(!loading && w > 0 && h > 0);
    };
    check();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (el && ro) ro.observe(el);
    const t = setTimeout(check, 100);
    return () => {
      if (el && ro) ro.unobserve(el);
      clearTimeout(t);
    };
  }, [loading]);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando dashboard de ventas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-accent/60" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight leading-tight text-foreground">
              Dashboard de Ventas
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rendimiento comercial y comportamiento de ingresos
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-background-subtle transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ventas Totales"
          value={kpis?.total_ventas || 0}
          prefix="$"
          icon={<DollarSign className="w-6 h-6 text-success" />}
        />
        <KPICard
          title="Ventas Mes Actual"
          value={kpis?.ventas_mes_actual || 0}
          prefix="$"
          icon={<ShoppingBag className="w-6 h-6 text-primary" />}
        />
        <KPICard
          title="Crecimiento"
          value={kpis?.crecimiento_mes_anterior || 0}
          suffix="%"
          trend={kpis?.crecimiento_mes_anterior >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="w-6 h-6 text-warning" />}
        />
        <KPICard
          title="Tickets Promedio"
          value={
            kpis?.total_ventas && kpis?.lotes_vendidos_mes
              ? kpis.total_ventas / kpis.lotes_vendidos_mes
              : 0
          }
          prefix="$"
          icon={<Map className="w-6 h-6 text-info" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div ref={chartContainerRef} className="min-h-[320px]">
          {canRenderChart ? (
            <GraficoVentasPorMes data={ventasMes} />
          ) : (
            <div className="w-full h-full min-h-[320px] bg-card border border-border rounded-2xl shadow-card animate-pulse flex items-center justify-center">
              <span className="text-muted-foreground">Cargando gráfico…</span>
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col items-center justify-center min-h-[300px]">
          <Map className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium text-foreground tracking-tight">
            Gráfico de Ventas por Zona
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Próximamente disponible
          </p>
        </div>
      </div>

      <RecentSalesTable ventas={ventasRecientes} />
    </div>
  );
}

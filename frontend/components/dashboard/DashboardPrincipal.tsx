'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import {
  fetchKPIs,
  fetchVentasPorMes,
  fetchVentasPorVendedor,
  fetchPagosPorEstatus,
  fetchLotesPorEstatus,
  fetchComisionesPorVendedor,
} from '@/lib/dashboard-api';
import { fetchPagos } from '@/lib/pagos-api';
import { KPICard } from './KPICard';
import { TablaRankingVendedores } from './TablaRankingVendedores';
import { TablaPagosRecientes } from './TablaPagosRecientes';
import { useDebounce } from '@/hooks/useDebounce';
import {
  KPIResponse,
  VentasPorMes,
  VentasPorVendedor,
  PagosPorEstatus,
  LotesPorEstatus,
  DashboardFilters,
} from '@/types/dashboard';
import { Pago } from '@/types/erp';
import {
  DollarSign,
  ShoppingBag,
  CreditCard,
  Users,
  Filter,
  Calendar,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { SelectorFormatoReporte } from '@/components/exportacion/SelectorFormatoReporte';
import { useSession } from 'next-auth/react';

// Lazy load chart components
const GraficoVentasPorMes = React.lazy(() =>
  import('./GraficoVentasPorMes').then((module) => ({ default: module.GraficoVentasPorMes })),
);
const GraficoVentasPorVendedor = React.lazy(() =>
  import('./GraficoVentasPorVendedor').then((module) => ({
    default: module.GraficoVentasPorVendedor,
  })),
);
const GraficoPagosPorEstatus = React.lazy(() =>
  import('./GraficoPagosPorEstatus').then((module) => ({ default: module.GraficoPagosPorEstatus })),
);
const GraficoLotesPorEstatus = React.lazy(() =>
  import('./GraficoLotesPorEstatus').then((module) => ({ default: module.GraficoLotesPorEstatus })),
);

const ChartLoader = () => (
  <div className="h-80 w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

export default function DashboardPrincipal() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const debouncedFilters = useDebounce(filters, 500);
  const [periodo, setPeriodo] = useState('mes_actual'); // 'hoy', 'semana', 'mes_actual', 'anio'
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data States
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [ventasMes, setVentasMes] = useState<VentasPorMes[]>([]);
  const [ventasVendedor, setVentasVendedor] = useState<VentasPorVendedor[]>([]);
  const [pagosEstatus, setPagosEstatus] = useState<PagosPorEstatus[]>([]);
  const [lotesEstatus, setLotesEstatus] = useState<LotesPorEstatus[]>([]);
  const [pagosRecientes, setPagosRecientes] = useState<Pago[]>([]);
  const [hasError, setHasError] = useState(false);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (status === 'loading') return;
    if (!session?.accessToken) {
      console.warn('No hay sesión activa o token de acceso');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setHasError(false);
    try {
      // Use debouncedFilters for the API call to ensure we're using the stable value
      const currentFilters = debouncedFilters;
      const token = session.accessToken;

      const [        kpiData,
        ventasMesData,
        ventasVendedorData,
        pagosEstatusData,
        lotesEstatusData,
        pagosRecientesData,
      ] = await Promise.all([
        fetchKPIs(currentFilters, token),
        fetchVentasPorMes(currentFilters, token),
        fetchVentasPorVendedor(currentFilters, token),
        fetchPagosPorEstatus(currentFilters, token),
        fetchLotesPorEstatus(currentFilters, token),
        fetchPagos({ limit: 20 }, token).catch((err) => {
          console.error('Error fetching recent payments:', err);
          setHasError(true);
          return [];
        }),
      ]);

      setKpis(kpiData);
      setVentasMes(ventasMesData);
      setVentasVendedor(ventasVendedorData);
      setPagosEstatus(pagosEstatusData);
      setLotesEstatus(lotesEstatusData);
      setPagosRecientes(pagosRecientesData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setHasError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [debouncedFilters, session, status]);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh interval (5 minutes)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Dashboard: Auto-refresh periódico (5m)');
        loadDashboardData(true); // Silent refresh
      }
    }, 300000); 

    // Listen for real-time updates from other tabs
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('dashboard_updates');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_SALE' || event.data?.type === 'REFRESH_DASHBOARD') {
          console.log('🔄 Dashboard: Actualizando datos por notificación externa');
          loadDashboardData(true); // Silent refresh
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or error:', e);
    }

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [loadDashboardData]);

  const handlePeriodoChange = (p: string) => {
    setPeriodo(p);
    const now = new Date();
    let start: Date | undefined;

    switch (p) {
      case 'hoy':
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'semana':
        const firstDay = now.getDate() - now.getDay();
        start = new Date(now.setDate(firstDay));
        break;
      case 'mes_actual':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'anio':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = undefined;
    }

    if (start) {
      setFilters((prev) => ({
        ...prev,
        fecha_inicio: start?.toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
      }));
    } else {
      setFilters((prev) => {
        const { fecha_inicio, fecha_fin, ...rest } = prev;
        return rest;
      });
    }
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="text-red-500 text-xl font-semibold">
          Error al cargar datos del dashboard
        </div>
        <button
          onClick={() => loadDashboardData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        {hasError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Atención: </strong>
            <span className="block sm:inline">Algunos datos no pudieron cargarse correctamente. Es posible que tu sesión haya expirado. Intenta recargar la página o iniciar sesión nuevamente.</span>
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Dashboard General
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <p>Resumen de operaciones y rendimiento</p>
              {lastUpdated && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {lastUpdated.toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex items-center">
              <select
                value={periodo}
                onChange={(e) => handlePeriodoChange(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
              >
                <option value="todo">Todo el periodo</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Esta Semana</option>
                <option value="mes_actual">Este Mes</option>
                <option value="anio">Este Año</option>
              </select>
            </div>

            <button
              onClick={() => loadDashboardData()}
              className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-colors relative"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <SelectorFormatoReporte
              title="Reporte General de Ventas"
              filename="reporte_dashboard"
              columns={[
                { header: 'Vendedor', dataKey: 'vendedor', width: 30 },
                { header: 'Ventas', dataKey: 'cantidad_ventas', width: 15 },
                { header: 'Monto Total', dataKey: 'total_vendido', width: 20 },
                { header: 'Comisiones', dataKey: 'total_comisiones', width: 20 },
              ]}
              data={ventasVendedor}
            />
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ventas Totales"
          value={kpis?.total_ventas || 0}
          change={kpis?.crecimiento_mes_anterior}
          trend={(kpis?.crecimiento_mes_anterior || 0) > 0 ? 'up' : 'down'}
          icon={<ShoppingBag className="w-6 h-6" />}
          tooltip="Número total de ventas en el periodo seleccionado"
        />
        <KPICard
          title="Ingresos Cobrados"
          value={kpis?.total_pagado || 0}
          prefix="$"
          trend="up"
          icon={<DollarSign className="w-6 h-6" />}
          tooltip="Monto total recaudado de pagos (enganches + mensualidades)"
        />
        <KPICard
          title="Cartera Pendiente"
          value={kpis?.total_pendiente || 0}
          prefix="$"
          trend="neutral"
          icon={<CreditCard className="w-6 h-6" />}
          tooltip="Monto total pendiente por cobrar"
        />
        <KPICard
          title="Lotes Vendidos"
          value={kpis?.lotes_vendidos_mes || 0}
          suffix=" unidades"
          trend="up"
          icon={<Users className="w-6 h-6" />}
          tooltip="Lotes vendidos en el mes actual"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartLoader />}>
            <GraficoVentasPorMes data={ventasMes} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<ChartLoader />}>
            <GraficoPagosPorEstatus data={pagosEstatus} />
          </Suspense>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96">
          <Suspense fallback={<ChartLoader />}>
            <GraficoLotesPorEstatus data={lotesEstatus} />
          </Suspense>
        </div>
        <div className="h-96">
          <Suspense fallback={<ChartLoader />}>
            <GraficoVentasPorVendedor data={ventasVendedor} />
          </Suspense>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaRankingVendedores data={ventasVendedor} />
        <TablaPagosRecientes data={pagosRecientes} />
      </div>
    </div>
  );
}

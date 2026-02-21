"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { directusClient, type DirectusResponse } from "@/lib/directus-api";
import KpiCard from "@/components/dashboard/kpi-card";
import { MonthlyRevenueArea } from "@/components/dashboard/charts";
import { formatCurrencyMXN, formatNumberCompact } from "@/lib/utils";

type KPIs = {
  ventas_activas?: number;
  monto_total_financiado?: number;
  pagos_vencidos?: number;
  lotes_disponibles?: number;
  monto_cobrado_mes_actual?: number;
  [key: string]: any;
};

function mapKpisFromAnalytics(raw: any): KPIs {
  const totalPagado = Number(raw?.total_pagado || 0);
  const totalPendiente = Number(raw?.total_pendiente || 0);
  return {
    ventas_activas: raw?.ventas_activas ?? raw?.total_ventas ?? 0,
    monto_total_financiado:
      raw?.monto_total_financiado ??
      raw?.total_financiado ??
      totalPagado + totalPendiente,
    pagos_vencidos: raw?.pagos_vencidos ?? 0,
    lotes_disponibles: raw?.lotes_disponibles ?? 0,
    monto_cobrado_mes_actual:
      raw?.monto_cobrado_mes_actual ?? totalPagado,
    ...raw,
  };
}

function SkeletonCard() {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-card animate-pulse">
      <div className="h-3 w-24 bg-surfacevariant rounded mb-3" />
      <div className="h-6 w-32 bg-surfacevariant rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [canRenderChart, setCanRenderChart] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await directusClient.get<{ data: any }>("/crm-analytics/kpis");
        const raw = res.data?.data || {};
        const mapped = mapKpisFromAnalytics(raw);
        if (!cancelled) setData(mapped);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Error al cargar dashboard';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(() => {
    const getN = (keys: string[], fallback = 0) => {
      for (const k of keys) {
        const v = (data as any)?.[k];
        if (typeof v === "number") return v;
      }
      return fallback;
    };
    return {
      ventas: getN(["ventas_activas", "ventas_activas_count", "total_ventas_activas"]),
      financiado: getN(["monto_total_financiado", "monto_financiado", "total_financiado"]),
      vencidos: getN(["pagos_vencidos", "pagos_vencidos_count", "total_pagos_vencidos"]),
      disponibles: getN(["lotes_disponibles", "lotes_disponibles_count", "inventario_disponible"]),
      cobradoMes: getN(["monto_cobrado_mes_actual", "ingresos_mes", "total_cobrado_mes"]),
    };
  }, [data]);

  const spark = (seed: number) =>
    Array.from({ length: 12 }).map((_, i) => ({ x: i, y: Math.max(0, Math.sin(i / 2 + seed) * 10 + 20 + (seed % 7)) }));

  const [series, setSeries] = useState<{ label: string; value: number }[]>([]);
  useEffect(() => {
    async function loadSeries() {
      try {
        const resp = await fetch("/api/dashboard/ventas-por-mes");
        const json = await resp.json();
        const arr = (json?.data || []) as { mes: number; anio: number; monto_total: number }[];
        const mapped = arr.map((d) => ({ label: `${d.mes}/${String(d.anio).slice(-2)}` , value: d.monto_total }));
        setSeries(mapped);
      } catch {
        // Fallback: serie simulada
        setSeries(Array.from({ length: 12 }).map((_, i) => ({ label: `${i+1}/A`, value: Math.max(0, Math.sin(i/2)*50000 + 120000) })));
      }
    }
    loadSeries();
  }, []);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    function updateSize() {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanRenderChart(true);
      }
    }

    updateSize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(el);
    }

    return () => {
      if (observer && el) {
        observer.unobserve(el);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold font-serif">Executive View</h1>
          <p className="text-sm text-muted-foreground">Resumen general de rendimiento y KPIs</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-card p-6 shadow-card">
          <h2 className="text-heading-lg">Error cargando dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              setData(null);
              try {
                const alt = await directusClient.get<{ data: any }>("/crm-analytics/kpis");
                const raw = alt.data?.data || {};
                const mapped = mapKpisFromAnalytics(raw);
                setData(mapped);
              } catch (e: any) {
                const status = e?.response?.status ?? e?.status;
                const code = e?.response?.data?.errors?.[0]?.extensions?.code;
                const isForbidden =
                  status === 403 || code === 'FORBIDDEN' || e?.name === 'ForbiddenError';
                const msg = isForbidden
                  ? 'No tienes permisos para ver los KPIs del dashboard.'
                  : e?.message || 'Error al cargar dashboard';
                setError(msg);
              } finally {
                setLoading(false);
              }
            }}
            className="mt-4 inline-flex items-center rounded-md border border-border bg-error/10 px-4 py-2 text-foreground hover:bg-error/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-serif">Executive View</h1>
        <p className="text-sm text-muted-foreground">Resumen general de rendimiento y KPIs</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas activas"
          value={formatNumberCompact(kpis.ventas)}
          spark={spark(1)}
          status="neutral"
        />
        <KpiCard
          title="Monto total financiado"
          value={formatCurrencyMXN(kpis.financiado)}
          spark={spark(2)}
          status="up"
        />
        <KpiCard
          title="Pagos vencidos"
          value={formatNumberCompact(kpis.vencidos)}
          spark={spark(3)}
          status={kpis.vencidos > 0 ? "alert" : "neutral"}
        />
        <KpiCard
          title="Lotes disponibles"
          value={formatNumberCompact(kpis.disponibles)}
          spark={spark(4)}
          status="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div ref={chartContainerRef} className="lg:col-span-2 min-h-[260px]">
          {canRenderChart ? (
            <MonthlyRevenueArea data={series} />
          ) : (
            <div className="h-64 w-full rounded-md border border-border bg-card p-4 shadow-card flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Cargando gráfico…</span>
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-4 shadow-card">
          <div className="mb-3 text-xl font-semibold font-serif">Alertas críticas</div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between rounded-md border border-border bg-accent/10 px-3 py-2">
              <span className="text-sm">Pagos vencidos</span>
              <span className="text-base font-semibold" style={{ color: "hsl(var(--accent-contrast))" }}>{formatNumberCompact(kpis.vencidos)}</span>
            </li>
            <li className="flex items-center justify-between rounded-md border border-border bg-accent/10 px-3 py-2">
              <span className="text-sm">Comisiones pendientes</span>
              <span className="text-sm text-muted-foreground">No disponible</span>
            </li>
          </ul>
          <div className="mt-4 text-xs text-muted-foreground">Ingresos del mes: {formatCurrencyMXN(kpis.cobradoMes)}</div>
        </div>
      </div>
    </div>
  );
}

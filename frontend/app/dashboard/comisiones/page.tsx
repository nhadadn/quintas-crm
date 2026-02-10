'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { fetchKPIs, fetchComisionesPorVendedor } from '@/lib/dashboard-api';
import { KPICard } from '@/components/dashboard/KPICard';
// import { TablaRankingVendedores } from '@/components/dashboard/TablaRankingVendedores';
import { Users, DollarSign, Briefcase, Award, RefreshCw, Clock } from 'lucide-react';

const TablaRankingVendedores = React.lazy(() => 
  import('@/components/dashboard/TablaRankingVendedores').then(module => ({ default: module.TablaRankingVendedores }))
);

export default function DashboardComisionesPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [comisionesVendedor, setComisionesVendedor] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = session.accessToken;
      const [kpiData, comisionesData] = await Promise.all([
        fetchKPIs(undefined, token),
        fetchComisionesPorVendedor(undefined, token),
      ]);
      setKpis(kpiData);
      setComisionesVendedor(comisionesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, loadData]);

  // Periodic refresh
  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [status, loadData]);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando dashboard de comisiones...
        </div>
      </div>
    );
  }

  const totalComisiones = comisionesVendedor.reduce(
    (acc, curr) => acc + (curr.total_comisiones || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard de Comisiones</h1>
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Comisiones Totales"
          value={totalComisiones}
          prefix="$"
          icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
        />
        <KPICard
          title="Comisiones Pendientes"
          value={kpis?.comisiones_pendientes || 0}
          prefix="$"
          icon={<Clock className="w-6 h-6 text-amber-400" />}
        />
        <KPICard
          title="Vendedores Activos"
          value={comisionesVendedor.length}
          icon={<Users className="w-6 h-6 text-blue-400" />}
        />
        <KPICard
          title="Mejor Vendedor"
          value={comisionesVendedor[0]?.vendedor || 'N/A'}
          icon={<Award className="w-6 h-6 text-purple-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Briefcase className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">Desglose por Tipo de Comisión</p>
          <p className="text-slate-500 text-sm mt-2">Próximamente disponible</p>
        </div>

        <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-slate-400">Cargando ranking...</div>}>
          <TablaRankingVendedores
            data={comisionesVendedor.map((c) => ({
              vendedor_id: c.vendedor_id,
              nombre: c.vendedor,
              total_ventas: c.cantidad_ventas,
              monto_total: c.total_vendido,
              comisiones_generadas: c.total_comisiones,
              promedio_venta: c.cantidad_ventas > 0 ? c.total_vendido / c.cantidad_ventas : 0,
            }))}
          />
        </Suspense>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">
            Detalle de Comisiones por Vendedor
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
              <tr>
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3 text-right">Ventas</th>
                <th className="px-6 py-3 text-right">Total Vendido</th>
                <th className="px-6 py-3 text-right">Comisión Total</th>
              </tr>
            </thead>
            <tbody>
              {comisionesVendedor.map((v, index) => (
                <tr key={v.vendedor_id ? `${v.vendedor_id}` : `vendedor-${index}`} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-slate-100">{v.vendedor}</td>
                  <td className="px-6 py-4 text-right">{v.cantidad_ventas}</td>
                  <td className="px-6 py-4 text-right">
                    {(v.total_vendido || 0).toLocaleString('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                    {(v.total_comisiones || 0).toLocaleString('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    })}
                  </td>
                </tr>
              ))}
              {comisionesVendedor.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No hay datos de comisiones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

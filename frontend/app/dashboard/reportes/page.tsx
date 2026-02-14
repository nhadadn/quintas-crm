'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchDashboardMetrics, DashboardMetrics } from '@/lib/reportes-api';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, TrendingDown, Users, DollarSign, 
  CreditCard, Activity, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportesPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subDays(new Date(), 30)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const loadData = async () => {
    if (status !== 'authenticated' || !session?.accessToken) return;
    
    setLoading(true);
    try {
      const data = await fetchDashboardMetrics(dateRange.start, dateRange.end, session.accessToken);
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, session, dateRange]);

  const handleExport = () => {
    toast.info('Exportando reporte...');
    // Here we would call the export endpoint (to be implemented fully or reused from backend)
    // For now, we can just trigger the existing PDF generation logic if available or placeholder
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/pagos/reportes/ingresos?formato=pdf&fecha_inicio=${dateRange.start}&fecha_fin=${dateRange.end}`, '_blank');
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Generando reportes financieros...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Reportes Financieros
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Métricas clave de rendimiento y proyecciones.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-0"
            />
            <span className="text-slate-400 mx-2">→</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-0"
            />
          </div>
          
          <button 
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="MRR" 
          value={`$${metrics?.mrr.mrr.toLocaleString('es-MX')}`} 
          subtext="Ingreso Mensual Recurrente"
          icon={<DollarSign className="w-6 h-6 text-emerald-500" />}
          trend={+5.2} // Placeholder for trend calculation
        />
        <KPICard 
          title="Suscripciones Activas" 
          value={metrics?.subscriptions.total_active || 0} 
          subtext={`${metrics?.subscriptions.new_subscriptions} nuevas este periodo`}
          icon={<Users className="w-6 h-6 text-blue-500" />}
          trend={metrics?.subscriptions.new_subscriptions && metrics.subscriptions.total_active ? (metrics.subscriptions.new_subscriptions / metrics.subscriptions.total_active * 100) : 0}
        />
        <KPICard 
          title="Churn Rate" 
          value={`${metrics?.churn.churn_rate.toFixed(1)}%`} 
          subtext={`${metrics?.churn.canceled_count} cancelaciones`}
          icon={<Activity className="w-6 h-6 text-rose-500" />}
          trend={-0.5} // Placeholder
          inverse
        />
        <KPICard 
          title="Tasa de Fallos" 
          value={`${metrics?.payment_health.failure_rate.toFixed(1)}%`} 
          subtext="Pagos fallidos vs totales"
          icon={<CreditCard className="w-6 h-6 text-amber-500" />}
          inverse
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR History */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Crecimiento MRR</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.mrr_history || []}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => format(new Date(v), 'MMM yyyy', { locale: es })} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
                  labelFormatter={(label) => format(new Date(label), 'MMMM yyyy', { locale: es })}
                />
                <Area type="monotone" dataKey="mrr" stroke="#8884d8" fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Proyección de Ingresos (3 Meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.revenue_forecast || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => format(new Date(v), 'MMM', { locale: es })} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Proyección']}
                  labelFormatter={(label) => format(new Date(label), 'MMMM yyyy', { locale: es })}
                />
                <Legend />
                <Line type="monotone" dataKey="predicted_revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} name="Ingreso Proyectado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Plan */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Ingresos por Plan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.revenue.breakdown || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="plan" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Breakdown (Placeholder for now as we don't have breakdown data yet) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Retención de Clientes</h3>
             <div className="w-48 h-48 relative flex items-center justify-center">
                <PieChart width={200} height={200}>
                  <Pie
                    data={[
                      { name: 'Activos', value: metrics?.subscriptions.total_active || 100 },
                      { name: 'Cancelados', value: metrics?.churn.canceled_count || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell key="active" fill="#10b981" />
                    <Cell key="canceled" fill="#f43f5e" />
                  </Pie>
                  <Tooltip />
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                        {metrics?.subscriptions.total_active ? 
                           (100 - (metrics.churn.churn_rate || 0)).toFixed(1) : 0}%
                    </span>
                    <span className="text-xs text-slate-500">Retención</span>
                </div>
             </div>
             <p className="text-sm text-slate-500 mt-4 max-w-xs">
                Porcentaje de usuarios que permanecen activos respecto al inicio del periodo.
             </p>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtext, icon, trend, inverse }: { title: string, value: string | number, subtext?: string, icon: React.ReactNode, trend?: number, inverse?: boolean }) {
  const isPositive = trend && trend > 0;
  const isGood = inverse ? !isPositive : isPositive;
  
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</h4>
        </div>
        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
          {icon}
        </div>
      </div>
      
      {(subtext || trend !== undefined) && (
        <div className="flex items-center gap-2 text-sm">
          {trend !== undefined && trend !== 0 && (
            <span className={`flex items-center font-medium ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </span>
          )}
          {subtext && <span className="text-slate-400 truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

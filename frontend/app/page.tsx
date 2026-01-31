'use client';

import React from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentSalesTable } from '@/components/dashboard/RecentSalesTable';

// Mock Data
const MOCK_STATS = [
  { title: 'Ventas del Mes', value: '$1,250,000', change: '+12%', changeType: 'positive' as const },
  { title: 'Lotes Disponibles', value: '45', change: '-3', changeType: 'negative' as const },
  { title: 'Pagos Pendientes', value: '12', change: '2 vencidos', changeType: 'negative' as const },
  { title: 'Clientes Activos', value: '128', change: '+5', changeType: 'positive' as const },
];

const MOCK_CHART_DATA = [
  { label: 'Ene', value: 450000 },
  { label: 'Feb', value: 320000 },
  { label: 'Mar', value: 550000 },
  { label: 'Abr', value: 480000 },
  { label: 'May', value: 600000 },
  { label: 'Jun', value: 750000 },
];

const MOCK_RECENT_SALES = [
  { id: 1, lote: 'A-001', cliente: 'Juan Pérez', fecha: '2025-06-15', monto: 150000, estatus: 'pagado' },
  { id: 2, lote: 'B-012', cliente: 'María López', fecha: '2025-06-14', monto: 200000, estatus: 'pendiente' },
  { id: 3, lote: 'C-005', cliente: 'Carlos Ruiz', fecha: '2025-06-12', monto: 180000, estatus: 'pagado' },
  { id: 4, lote: 'A-003', cliente: 'Ana García', fecha: '2025-06-10', monto: 160000, estatus: 'cancelado' },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Dashboard General</h1>
          <p className="text-slate-400 mt-1">Resumen de actividad y rendimiento</p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {MOCK_STATS.map((stat, i) => (
            <StatsCard key={i} {...stat} />
          ))}
        </div>

        {/* Charts & Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SalesChart title="Ventas Mensuales (2025)" data={MOCK_CHART_DATA} />
            <RecentSalesTable ventas={MOCK_RECENT_SALES} />
          </div>
          
          <div className="space-y-6">
            {/* Quick Actions / Notifications */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Acciones Rápidas</h3>
              <div className="space-y-3">
                <Link href="/ventas/nueva" className="block w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded font-medium transition-colors">
                  Nueva Venta
                </Link>
                <Link href="/pagos/registrar" className="block w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-center rounded font-medium transition-colors">
                  Registrar Pago
                </Link>
                <Link href="/clientes/nuevo" className="block w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-center rounded font-medium transition-colors">
                  Nuevo Cliente
                </Link>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Notificaciones</h3>
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300">Pago recibido de Lote A-001</p>
                    <p className="text-xs text-slate-500">Hace 10 min</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-2 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300">Lote C-005 apartado por web</p>
                    <p className="text-xs text-slate-500">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-400 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300">Pago vencido Lote B-012</p>
                    <p className="text-xs text-slate-500">Ayer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import React from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import TablaAmortizacion from '@/components/gestion/TablaAmortizacion';
import { FilaAmortizacion } from '@/types/erp';

// Mock Data para el Portal Cliente
const MOCK_CLIENTE_STATS = [
  { title: 'Total Pagado', value: '$150,000', change: '45% del total', changeType: 'positive' as const },
  { title: 'Saldo Pendiente', value: '$183,333', change: '55% restante', changeType: 'negative' as const },
  { title: 'Próximo Pago', value: '$8,333', change: 'Vence 15/07/2025', changeType: 'negative' as const },
  { title: 'Lote Asignado', value: 'A-001', change: 'Manzana A', changeType: 'positive' as const },
];

const MOCK_AMORTIZACION: FilaAmortizacion[] = Array.from({ length: 12 }, (_, i) => ({
  numero_pago: i + 1,
  fecha_vencimiento: new Date(2025, i, 15).toISOString().split('T')[0] || '',
  cuota: 8333.33,
  interes: 0,
  capital: 8333.33,
  saldo_restante: 333333 - ((i + 1) * 8333.33),
  estatus: i < 5 ? 'pagado' : 'pendiente'
}));

export default function PortalClientePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Mi Portal</h1>
            <p className="text-slate-400 mt-1">Bienvenido, Juan Pérez</p>
          </div>
          <div className="bg-emerald-900/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium border border-emerald-800">
            Contrato Activo #CNT-2025-001
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {MOCK_CLIENTE_STATS.map((stat, i) => (
            <StatsCard key={i} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabla de Amortización */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Estado de Cuenta</h2>
              <TablaAmortizacion amortizacion={MOCK_AMORTIZACION} />
            </div>
          </div>

          {/* Sidebar / Documentos */}
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Documentos</h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Contrato de Compraventa</span>
                  </div>
                  <span className="text-xs text-slate-400">PDF</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Reglamento Interno</span>
                  </div>
                  <span className="text-xs text-slate-400">PDF</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium">Recibo de Apartado</span>
                  </div>
                  <span className="text-xs text-slate-400">PDF</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Mis Datos</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">Nombre</label>
                  <div className="font-medium text-slate-200">Juan Pérez</div>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">Email</label>
                  <div className="font-medium text-slate-200">juan.perez@email.com</div>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">Teléfono</label>
                  <div className="font-medium text-slate-200">55 1234 5678</div>
                </div>
                <button className="w-full py-2 mt-2 border border-slate-600 rounded hover:bg-slate-700 text-slate-300 transition-colors">
                  Editar Información
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

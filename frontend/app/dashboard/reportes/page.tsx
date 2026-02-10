import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reportes - Quintas CRM',
  description: 'Generación y exportación de reportes',
};

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Reportes</h1>
        <p className="text-slate-400">
          Generación de reportes personalizados y exportación de datos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Reportes de Ventas
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Descarga el historial completo de ventas en formato Excel o PDF.
          </p>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium">
            Generar Reporte
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Estado de Cartera
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Resumen de pagos pendientes, vencidos y proyecciones de cobro.
          </p>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium">
            Generar Reporte
          </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              En Construcción
            </h3>
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              <p>
                El módulo de reportes avanzados está en desarrollo. Pronto podrás personalizar
                filtros y formatos de exportación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

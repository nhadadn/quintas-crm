import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { VentasPorVendedor } from '@/types/dashboard';

interface TablaRankingVendedoresProps {
  data: VentasPorVendedor[];
}

type SortField = 'total_ventas' | 'monto_total' | 'comisiones_generadas' | 'promedio_venta';
type SortDirection = 'asc' | 'desc';

export function TablaRankingVendedores({ data }: TablaRankingVendedoresProps) {
  const [sortField, setSortField] = useState<SortField>('monto_total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Ensure data is an array before processing
  const safeData = Array.isArray(data) ? data : [];

  const sortedData = [...safeData].sort((a, b) => {
    const valA = a[sortField] ?? 0;
    const valB = b[sortField] ?? 0;
    const factor = sortDirection === 'asc' ? 1 : -1;
    return (valA - valB) * factor;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 text-indigo-600" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-indigo-600" />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
          <Trophy className="w-5 h-5 text-amber-500 mr-2" />
          Ranking de Vendedores
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4 w-12">#</th>
              <th className="px-6 py-4">Vendedor</th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('total_ventas')}
              >
                <div className="flex items-center">
                  Ventas
                  <SortIcon field="total_ventas" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('monto_total')}
              >
                <div className="flex items-center">
                  Monto Total
                  <SortIcon field="monto_total" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('promedio_venta')}
              >
                <div className="flex items-center">
                  Promedio
                  <SortIcon field="promedio_venta" />
                </div>
              </th>
              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('comisiones_generadas')}
              >
                <div className="flex items-center">
                  Comisiones
                  <SortIcon field="comisiones_generadas" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedData.map((item, index) => (
              <tr
                key={item.vendedor_id ?? `vendedor-${index}`}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 text-slate-500 font-medium">{index + 1}</td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                  {item.nombre}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {item.total_ventas ?? 0}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                  ${(item.monto_total ?? 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  ${(item.promedio_venta ?? 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">
                  ${(item.comisiones_generadas ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

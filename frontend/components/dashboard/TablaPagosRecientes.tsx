import React, { useState } from 'react';
import { Calendar, User, DollarSign, Tag, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { Pago } from '@/types/erp';

interface TablaPagosRecientesProps {
  data: Pago[];
}

const ITEMS_PER_PAGE = 5;

export function TablaPagosRecientes({ data }: TablaPagosRecientesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pagado' | 'pendiente' | 'atrasado'>(
    'all',
  );

  // Filtrar datos
  const filteredData = data.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.estatus === statusFilter;
  });

  // Paginación
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'pagado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pendiente':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'atrasado':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Pagos Recientes
        </h3>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Filtrar:</span>
          <select
            className="text-sm border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500 p-1.5"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="pagado">Pagados</option>
            <option value="pendiente">Pendientes</option>
            <option value="atrasado">Atrasados</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Venta/Lote</th>
              <th className="px-6 py-4">Monto</th>
              <th className="px-6 py-4">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.length > 0 ? (
              paginatedData.map((pago) => (
                <tr
                  key={pago.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      {new Date(pago.fecha_pago || pago.fecha_vencimiento).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center font-medium text-slate-900 dark:text-slate-100">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {/* @ts-ignore - Assuming relations are expanded */}
                      {pago.venta_id?.cliente_id?.nombre || 'Cliente'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col">
                      {/* @ts-ignore - Assuming relations are expanded */}
                      <span className="text-xs text-slate-500">Venta #{pago.venta_id?.id}</span>
                      <span className="font-medium">
                        Lote {(() => {
                          const lote = (pago.venta_id as any)?.lote_id;
                          if (!lote) return 'N/A';
                          // Handle if lote is just an ID
                          if (typeof lote !== 'object') return lote;
                          
                          const numeroLote = lote.numero_lote;
                          // Safe render if numero_lote is unexpectedly an object
                          if (typeof numeroLote === 'object' && numeroLote !== null) {
                            return numeroLote.identificador || numeroLote.numero_lote || 'N/A';
                          }
                          return numeroLote || 'N/A';
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    ${pago.monto.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(pago.estatus)}`}
                    >
                      {pago.estatus}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No se encontraron pagos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

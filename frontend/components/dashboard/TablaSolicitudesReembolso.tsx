import React, { useState } from 'react';
import { Calendar, User, DollarSign, Tag, ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Reembolso, approveRefund, rejectRefund } from '@/lib/reembolsos-api';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface TablaSolicitudesReembolsoProps {
  data: Reembolso[];
  onUpdate: () => void;
}

const ITEMS_PER_PAGE = 5;

export function TablaSolicitudesReembolso({ data, onUpdate }: TablaSolicitudesReembolsoProps) {
  const { data: session } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado' | 'procesado' | 'fallido'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filtrar datos
  const filteredData = data.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.estado === statusFilter;
  });

  // Paginación
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'aprobado':
      case 'procesado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pendiente':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'rechazado':
      case 'fallido':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('¿Estás seguro de aprobar este reembolso? Esta acción iniciará la transferencia de fondos.')) return;
    
    setProcessingId(id);
    try {
      await approveRefund(id, session?.accessToken);
      toast.success('Reembolso aprobado correctamente');
      onUpdate();
    } catch (error) {
      toast.error('Error al aprobar reembolso');
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedRefundId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRefundId) return;
    if (rejectReason.length < 5) {
      toast.error('El motivo debe tener al menos 5 caracteres');
      return;
    }

    setProcessingId(selectedRefundId);
    try {
      await rejectRefund(selectedRefundId, rejectReason, session?.accessToken);
      toast.success('Reembolso rechazado');
      setRejectModalOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Error al rechazar reembolso');
      console.error(error);
    } finally {
      setProcessingId(null);
      setSelectedRefundId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Solicitudes de Reembolso
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
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="procesado">Procesados</option>
            <option value="rechazado">Rechazados</option>
            <option value="fallido">Fallidos</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Fecha Solicitud</th>
              <th className="px-6 py-4">Solicitado Por</th>
              <th className="px-6 py-4">Monto</th>
              <th className="px-6 py-4">Razón</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      {new Date(item.fecha_solicitud).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center font-medium text-slate-900 dark:text-slate-100">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {/* Assuming relation expanded or just ID */}
                      {typeof item.solicitado_por === 'object' 
                        ? `${item.solicitado_por.first_name || ''} ${item.solicitado_por.last_name || ''}`
                        : 'Usuario'}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    ${Number(item.monto_reembolsado).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={item.razon}>
                    {item.razon}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(item.estado)}`}
                    >
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.estado === 'pendiente' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={processingId === item.id}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors disabled:opacity-50"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openRejectModal(item.id)}
                          disabled={processingId === item.id}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors disabled:opacity-50"
                          title="Rechazar"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No se encontraron solicitudes
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

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Rechazar Solicitud
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Por favor indica el motivo del rechazo. Este mensaje será enviado al cliente.
            </p>
            <textarea
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
              placeholder="Motivo del rechazo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processingId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {processingId ? 'Procesando...' : 'Rechazar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

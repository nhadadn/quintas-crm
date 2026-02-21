'use client';

import React, { useState, useMemo } from 'react';
import { PagoPerfil, EstadisticasCliente } from '@/lib/perfil-api';
import {
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { ModalPagoStripe } from './ModalPagoStripe';
import { ModalSolicitarReembolso } from './ModalSolicitarReembolso';

interface TablaPagosClienteProps {
  pagos: PagoPerfil[];
  estadisticas: EstadisticasCliente;
  ventaId?: number; // Optional context if we want to filter by specific sale initially
  clienteId: string | number;
}

type SortField = 'fecha_pago' | 'monto' | 'estatus';
type SortDirection = 'asc' | 'desc';

export function TablaPagosCliente({ pagos, estadisticas, clienteId }: TablaPagosClienteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('fecha_pago');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPagoForPayment, setSelectedPagoForPayment] = useState<PagoPerfil | null>(null);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPagoForRefund, setSelectedPagoForRefund] = useState<PagoPerfil | null>(null);

  const itemsPerPage = 10;

  const handlePagar = (pago: PagoPerfil) => {
    setSelectedPagoForPayment(pago);
    setIsPaymentModalOpen(true);
  };

  const handleRefund = (pago: PagoPerfil) => {
    setSelectedPagoForRefund(pago);
    setIsRefundModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh logic could go here, for now reload page or invalidate cache
    window.location.reload();
  };

  // Formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Fix potential timezone issues by parsing manually if needed, or stick to simple formatting
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pagado':
        return 'bg-success/10 text-success border-success/40';
      case 'pendiente':
        return 'bg-warning/10 text-warning border-warning/40';
      case 'vencido':
        return 'bg-danger/10 text-danger border-danger/40';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted';
    }
  };

  // Filter and Sort
  const filteredAndSortedPagos = useMemo(() => {
    let result = [...pagos];

    // Filter by search term (amount or concept)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.monto.toString().includes(searchTerm) ||
          (p.concepto && p.concepto.toLowerCase().includes(lowerTerm)) ||
          (p.numero_parcialidad && `parcialidad ${p.numero_parcialidad}`.includes(lowerTerm)) ||
          (p.venta_id && p.venta_id.toString().includes(lowerTerm)) ||
          (p.numero_lote && p.numero_lote.toLowerCase().includes(lowerTerm)),
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.estatus?.toLowerCase() === statusFilter);
    }

    // Filter by date range
    if (startDate) {
      result = result.filter((p) => new Date(p.fecha_pago) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter((p) => new Date(p.fecha_pago) <= new Date(endDate));
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'fecha_pago') {
        valA = new Date(a.fecha_pago).getTime();
        valB = new Date(b.fecha_pago).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [pagos, searchTerm, statusFilter, startDate, endDate, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPagos.length / itemsPerPage);
  const paginatedPagos = filteredAndSortedPagos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to newest/highest first
    }
  };

  const handleDownload = async (id: number) => {
    try {
      setDownloadingId(id);

      const response = await fetch(`/api/reportes/recibo-pago?id=${id}`);

      if (!response.ok) {
        throw new Error('Error al descargar el recibo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-pago-${id}.pdf`; // Adjust extension based on actual response
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Notificación opcional: éxito
    } catch (error) {
      console.error('Download error:', error);
      // Notificación opcional: error
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Total Pagado</p>
            <p className="text-2xl font-bold text-success mt-1">
              {formatCurrency(estadisticas.total_pagado)}
            </p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg">
            <DollarSign className="w-6 h-6 text-success" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Saldo Pendiente</p>
            <p className="text-2xl font-bold text-warning mt-1">
              {formatCurrency(estadisticas.saldo_pendiente)}
            </p>
          </div>
          <div className="p-3 bg-warning/10 rounded-lg">
            <Clock className="w-6 h-6 text-warning" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Próximo Vencimiento</p>
            <p className="text-xl font-bold text-foreground mt-1">
              {estadisticas.proximo_pago ? formatDate(estadisticas.proximo_pago.fecha_pago) : 'N/A'}
            </p>
            {estadisticas.proximo_pago && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatCurrency(estadisticas.proximo_pago.monto)}
              </p>
            )}
          </div>
          <div className="p-3 bg-info/10 rounded-lg">
            <AlertCircle className="w-6 h-6 text-info" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-background-paper p-6 rounded-2xl border border-border shadow-card">
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
            type="text"
            placeholder="Buscar por monto, concepto, lote o venta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-light transition-colors"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full md:w-40 pl-9 pr-3 py-2.5 bg-input border border-input rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-light transition-colors"
                placeholder="Desde"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative w-full md:w-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full md:w-40 pl-9 pr-3 py-2.5 bg-input border border-input rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-light transition-colors"
                placeholder="Hasta"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto bg-input border border-input rounded-xl text-foreground py-2.5 pl-3 pr-8 focus:outline-none focus:border-primary-light transition-colors cursor-pointer"
            >
              <option value="all">Todos los estatus</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-background-subtle text-foreground uppercase font-medium">
              <tr>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-background-subtle transition-colors"
                  onClick={() => handleSort('fecha_pago')}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </th>
                <th className="px-6 py-4">Concepto / Ref</th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-background-subtle transition-colors"
                  onClick={() => handleSort('monto')}
                >
                  <div className="flex items-center gap-2">
                    Monto
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-background-subtle transition-colors"
                  onClick={() => handleSort('estatus')}
                >
                  <div className="flex items-center gap-2">
                    Estatus
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedPagos.length > 0 ? (
                paginatedPagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-background-subtle transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {formatDate(pago.fecha_pago)}
                    </td>
                    <td className="px-6 py-4">
                      {pago.numero_parcialidad
                        ? `Parcialidad ${pago.numero_parcialidad}`
                        : pago.concepto || 'Pago General'}
                    </td>
                    <td className="px-6 py-4 font-mono text-foreground">
                      {formatCurrency(pago.monto)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(pago.estatus)}`}
                      >
                        {pago.estatus?.toUpperCase() || 'DESCONOCIDO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(pago.estatus === 'pendiente' ||
                          pago.estatus === 'vencido' ||
                          pago.estatus === 'atrasado') && (
                          <button
                            onClick={() => handlePagar(pago)}
                            className="p-2 text-success hover:text-success/80 hover:bg-success/10 rounded-lg transition-colors"
                            title="Pagar ahora"
                          >
                            <CreditCard className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(pago.id)}
                          disabled={downloadingId === pago.id}
                          className="text-primary-light hover:text-primary transition-colors p-2 hover:bg-primary-light/10 rounded-lg disabled:opacity-50"
                          title="Descargar Recibo"
                        >
                          {downloadingId === pago.id ? (
                            <div className="w-5 h-5 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No se encontraron pagos que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {paginatedPagos.length > 0 ? (
          paginatedPagos.map((pago) => (
            <div key={pago.id} className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                    {formatDate(pago.fecha_pago)}
                  </p>
                  <p className="font-medium text-foreground">
                    {pago.numero_parcialidad
                      ? `Parcialidad ${pago.numero_parcialidad}`
                      : pago.concepto || 'Pago General'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(pago.estatus)}`}
                >
                  {pago.estatus?.toUpperCase() || 'DESCONOCIDO'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="font-mono text-lg font-bold text-foreground">
                  {formatCurrency(pago.monto)}
                </span>
                <div className="flex gap-2">
                  {(pago.estatus === 'pendiente' ||
                    pago.estatus === 'vencido' ||
                    pago.estatus === 'atrasado') && (
                    <button
                      onClick={() => handlePagar(pago)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-success hover:bg-success/80 rounded-lg text-sm text-background-paper transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pagar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDownload(pago.id)}
                    disabled={downloadingId === pago.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background-paper hover:bg-background-subtle rounded-lg text-sm text-primary-light transition-colors disabled:opacity-50"
                  >
                    {downloadingId === pago.id ? (
                      <div className="w-4 h-4 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Recibo</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No se encontraron pagos.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-background-paper p-4 rounded-xl border border-border">
          <div className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">Mostrando </span>
            <span className="font-medium text-foreground">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            -{' '}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredAndSortedPagos.length)}
            </span>
            <span className="hidden sm:inline">
              {' '}
              de <span className="font-medium text-foreground">{filteredAndSortedPagos.length}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-background-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-background-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Siguiente página"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {selectedPagoForPayment && (
        <ModalPagoStripe
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          pagoId={selectedPagoForPayment.id}
          clienteId={clienteId.toString()}
          monto={selectedPagoForPayment.saldo_restante || selectedPagoForPayment.monto}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

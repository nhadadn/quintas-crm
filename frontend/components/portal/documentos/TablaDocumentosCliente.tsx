'use client';

import React, { useState, useMemo } from 'react';
import { DocumentoPortal, TipoDocumento } from '@/lib/documentos-api';
import {
  Download,
  Search,
  Filter,
  FileText,
  FileCheck,
  FileSpreadsheet,
  File,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TablaDocumentosClienteProps {
  documentos: DocumentoPortal[];
}

type SortField = 'fecha' | 'titulo' | 'tipo';
type SortDirection = 'asc' | 'desc';

export function TablaDocumentosCliente({ documentos }: TablaDocumentosClienteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const itemsPerPage = 10;

  // Icons mapping
  const getIcon = (tipo: TipoDocumento) => {
    switch (tipo) {
      case 'contrato':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'recibo':
        return <FileCheck className="w-5 h-5 text-emerald-400" />;
      case 'estado_cuenta':
        return <FileSpreadsheet className="w-5 h-5 text-amber-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeLabel = (tipo: TipoDocumento) => {
    switch (tipo) {
      case 'contrato':
        return 'Contrato';
      case 'recibo':
        return 'Recibo';
      case 'estado_cuenta':
        return 'Estado de Cuenta';
      default:
        return 'Documento';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filter and Sort
  const filteredAndSortedDocs = useMemo(() => {
    let result = [...documentos];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.titulo.toLowerCase().includes(lowerTerm) ||
          d.id.toLowerCase().includes(lowerTerm) ||
          (d.referencia && d.referencia.toLowerCase().includes(lowerTerm)),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((d) => d.tipo === typeFilter);
    }

    if (startDate) {
      result = result.filter((d) => new Date(d.fecha) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter((d) => new Date(d.fecha) <= new Date(endDate));
    }

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'fecha') {
        valA = new Date(a.fecha).getTime();
        valB = new Date(b.fecha).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [documentos, searchTerm, typeFilter, startDate, endDate, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDocs.length / itemsPerPage);
  const paginatedDocs = filteredAndSortedDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAllPage = () => {
    const pageIds = paginatedDocs.map((d) => d.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    const newSelected = new Set(selectedIds);

    if (allSelected) {
      pageIds.forEach((id) => newSelected.delete(id));
    } else {
      pageIds.forEach((id) => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  // Actions
  const handleDownload = async (doc: DocumentoPortal) => {
    try {
      setDownloadingId(doc.id);

      // Simulate fetch to get blob (reuse existing logic or direct link)
      // If it's a direct link (e.g. to PDF), we can just open it, but for consistent UX we might fetch it
      const response = await fetch(doc.url_descarga);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Notificación opcional: éxito
    } catch (error) {
      console.error(error);
      // Notificación opcional: error
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsZipping(true);
      const docsToDownload = documentos.filter((d) => selectedIds.has(d.id));

      // Call ZIP endpoint
      const response = await fetch('/api/documentos/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: docsToDownload }),
      });

      if (!response.ok) throw new Error('Error generando ZIP');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_quintas_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Notificación opcional: éxito masivo
      setSelectedIds(new Set()); // Clear selection
    } catch (error) {
      console.error(error);
      // Notificación opcional: error masivo
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-light transition-colors"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm p-2"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm p-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-slate-200 py-2 pl-3 pr-8 focus:outline-none focus:border-primary-light transition-colors cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              <option value="recibo">Recibos</option>
              <option value="contrato">Contratos</option>
              <option value="estado_cuenta">Estados de Cuenta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-primary-light/10 border border-primary-light/20 p-3 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-primary-light font-medium text-sm">
            {selectedIds.size} documentos seleccionados
          </span>
          <button
            onClick={handleBulkDownload}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 bg-primary-light text-slate-900 rounded-lg font-medium hover:bg-primary transition-colors text-sm disabled:opacity-50"
          >
            {isZipping ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar ZIP
          </button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-4 w-12">
                  <button onClick={toggleAllPage} className="flex items-center">
                    {paginatedDocs.length > 0 &&
                    paginatedDocs.every((d) => selectedIds.has(d.id)) ? (
                      <CheckSquare className="w-5 h-5 text-primary-light" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-slate-800"
                  onClick={() => handleSort('titulo')}
                >
                  <div className="flex items-center gap-2">
                    Documento <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-slate-800"
                  onClick={() => handleSort('tipo')}
                >
                  <div className="flex items-center gap-2">
                    Tipo <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-slate-800"
                  onClick={() => handleSort('fecha')}
                >
                  <div className="flex items-center gap-2">
                    Fecha <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {paginatedDocs.length > 0 ? (
                paginatedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-700/30 transition-colors ${selectedIds.has(doc.id) ? 'bg-slate-700/20' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelection(doc.id)}>
                        {selectedIds.has(doc.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary-light" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                          {getIcon(doc.tipo)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{doc.titulo}</p>
                          <p className="text-xs text-slate-500">{doc.referencia}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
                        {getTypeLabel(doc.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{formatDate(doc.fecha)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="text-primary-light hover:text-primary transition-colors p-2 hover:bg-primary-light/10 rounded-lg disabled:opacity-50"
                        title="Descargar"
                      >
                        {downloadingId === doc.id ? (
                          <div className="w-5 h-5 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron documentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {paginatedDocs.map((doc) => (
          <div
            key={doc.id}
            className={`bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm ${selectedIds.has(doc.id) ? 'ring-1 ring-primary-light' : ''}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <button onClick={() => toggleSelection(doc.id)} className="mt-1">
                {selectedIds.has(doc.id) ? (
                  <CheckSquare className="w-5 h-5 text-primary-light" />
                ) : (
                  <Square className="w-5 h-5 text-slate-500" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-slate-200">{doc.titulo}</h3>
                  <span className="text-xs text-slate-400">{formatDate(doc.fecha)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{doc.referencia}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-700 mt-3">
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                {getIcon(doc.tipo)}
                {getTypeLabel(doc.tipo)}
              </span>
              <button
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-primary-light transition-colors disabled:opacity-50"
              >
                {downloadingId === doc.id ? (
                  <div className="w-4 h-4 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Descargar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          {/* Same pagination logic as Pagos table */}
          <div className="text-sm text-slate-400">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-700 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-700 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

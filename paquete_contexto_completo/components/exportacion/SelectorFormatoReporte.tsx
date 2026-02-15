import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { ExportadorPDF } from './ExportadorPDF';
import { ExportadorExcel } from './ExportadorExcel';
import { saveAs } from 'file-saver';

interface Column {
  header: string;
  dataKey: string;
  width?: number;
}

interface SelectorFormatoReporteProps {
  title: string;
  columns: Column[];
  data: any[];
  filename?: string;
}

export const SelectorFormatoReporte: React.FC<SelectorFormatoReporteProps> = ({
  title,
  columns,
  data,
  filename = 'reporte',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportCSV = () => {
    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns.map((c) => JSON.stringify(row[c.dataKey] || '')).join(','),
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center items-center w-full rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500 transition-colors"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
        >
          <div className="py-1" role="none">
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
              Seleccione formato
            </div>

            <div
              className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
              role="menuitem"
            >
              <div className="w-full" onClick={() => setIsOpen(false)}>
                <ExportadorPDF
                  title={title}
                  columns={columns}
                  data={data}
                  filename={`${filename}.pdf`}
                />
              </div>
            </div>

            <div
              className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
              role="menuitem"
            >
              <div className="w-full" onClick={() => setIsOpen(false)}>
                <ExportadorExcel
                  title={title}
                  columns={columns}
                  data={data}
                  filename={`${filename}.xlsx`}
                />
              </div>
            </div>

            <button
              onClick={() => {
                handleExportCSV();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              role="menuitem"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors w-full">
                <File className="w-4 h-4" />
                CSV
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close menu when clicking outside */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
};

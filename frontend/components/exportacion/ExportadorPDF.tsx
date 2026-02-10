import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';

interface Column {
  header: string;
  dataKey: string;
}

interface ExportadorPDFProps {
  title: string;
  columns: Column[];
  data: any[];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
}

export const ExportadorPDF: React.FC<ExportadorPDFProps> = ({
  title,
  columns,
  data,
  filename = 'reporte.pdf',
  orientation = 'portrait',
}) => {
  const handleExport = () => {
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
    });

    // Header
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(18);
    doc.text('Quintas de Otinapa', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 15, 15, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 35,
      head: [columns.map((col) => col.header)],
      body: data.map((row) => columns.map((col) => row[col.dataKey])),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        // Footer
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(str, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      },
    });

    doc.save(filename);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
    >
      <FileDown className="w-4 h-4" />
      PDF
    </button>
  );
};

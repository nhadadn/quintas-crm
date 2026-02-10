import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileSpreadsheet } from 'lucide-react';

interface Column {
  header: string;
  dataKey: string;
  width?: number;
}

interface ExportadorExcelProps {
  title: string;
  columns: Column[];
  data: any[];
  filename?: string;
  sheetName?: string;
}

export const ExportadorExcel: React.FC<ExportadorExcelProps> = ({
  title,
  columns,
  data,
  filename = 'reporte.xlsx',
  sheetName = 'Datos',
}) => {
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Title
    worksheet.mergeCells('A1', String.fromCharCode(65 + columns.length - 1) + '1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }, // Emerald-500
    };

    // Date
    worksheet.mergeCells('A2', String.fromCharCode(65 + columns.length - 1) + '2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Fecha de generación: ${new Date().toLocaleDateString()}`;
    dateCell.font = { italic: true, size: 10 };
    dateCell.alignment = { horizontal: 'right' };

    // Headers
    const headerRow = worksheet.getRow(4);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }, // Slate-800
      };
      worksheet.getColumn(index + 1).width = col.width || 20;
    });

    // Data
    data.forEach((item) => {
      const rowData = columns.map((col) => item[col.dataKey]);
      worksheet.addRow(rowData);
    });

    // Add borders to data table
    const lastRow = 4 + data.length;
    for (let r = 4; r <= lastRow; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
    >
      <FileSpreadsheet className="w-4 h-4" />
      Excel
    </button>
  );
};

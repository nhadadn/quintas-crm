import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const exportToPDF = (res, data, title, columns) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  );

  doc.pipe(res);

  // Header
  doc.fontSize(18).text(title, { align: 'center' });
  doc.fontSize(10).text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  // Iterate data
  data.forEach((item, index) => {
    if (doc.y > 700) doc.addPage();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Registro #${index + 1}`);
    doc.font('Helvetica');

    columns.forEach((col) => {
      let val = item;
      // Handle nested keys like 'cliente_id.nombre'
      const keys = col.key.split('.');
      for (const k of keys) {
        if (val && val[k] !== undefined) {
          val = val[k];
        } else {
          val = '';
          break;
        }
      }

      // Format value if needed (e.g. dates, currency)
      if (col.format && val !== '') {
        val = col.format(val);
      }

      doc.fontSize(10).text(`${col.header}: ${val}`, { continued: false });
    });
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
  });

  doc.end();
};

export const exportToExcel = async (res, data, title, columns) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reporte');

  sheet.columns = columns.map((col) => ({ header: col.header, key: col.key, width: 30 }));

  const rows = data.map((item) => {
    const row = {};
    columns.forEach((col) => {
      let val = item;
      const keys = col.key.split('.');
      for (const k of keys) {
        if (val && val[k] !== undefined) {
          val = val[k];
        } else {
          val = '';
          break;
        }
      }

      if (col.format && val !== '') {
        val = col.format(val);
      }

      row[col.key] = val;
    });
    return row;
  });

  sheet.addRows(rows);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-MX');
};

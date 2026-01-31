import React from 'react';
import { FilaAmortizacion } from '@/types/erp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TablaAmortizacionProps {
  amortizacion: FilaAmortizacion[];
}

export default function TablaAmortizacion({ amortizacion }: TablaAmortizacionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Tabla de Amortización', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = amortizacion.map(pago => [
      pago.numero_pago,
      formatDate(pago.fecha_vencimiento),
      formatCurrency(pago.cuota),
      formatCurrency(pago.interes),
      formatCurrency(pago.capital),
      formatCurrency(pago.saldo_restante),
      pago.estatus.toUpperCase()
    ]);

    autoTable(doc, {
      head: [['No.', 'Fecha', 'Pago Total', 'Interés', 'Capital', 'Saldo', 'Estado']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-600
    });

    doc.save('tabla-amortizacion.pdf');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar PDF
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-200 uppercase bg-slate-800">
            <tr>
              <th scope="col" className="px-6 py-3">No.</th>
              <th scope="col" className="px-6 py-3">Fecha</th>
              <th scope="col" className="px-6 py-3">Monto</th>
              <th scope="col" className="px-6 py-3">Interés</th>
              <th scope="col" className="px-6 py-3">Capital</th>
              <th scope="col" className="px-6 py-3">Saldo</th>
              <th scope="col" className="px-6 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {amortizacion.map((pago) => (
              <tr key={pago.numero_pago} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                <td className="px-6 py-4">{pago.numero_pago}</td>
                <td className="px-6 py-4">{formatDate(pago.fecha_vencimiento)}</td>
                <td className="px-6 py-4 font-medium text-slate-200">{formatCurrency(pago.cuota)}</td>
                <td className="px-6 py-4">{formatCurrency(pago.interes)}</td>
                <td className="px-6 py-4">{formatCurrency(pago.capital)}</td>
                <td className="px-6 py-4">{formatCurrency(pago.saldo_restante)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pago.estatus === 'pagado' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' :
                    pago.estatus === 'pendiente' ? 'bg-slate-700 text-slate-300 border border-slate-600' :
                    'bg-red-900/50 text-red-400 border border-red-800'
                  }`}>
                    {pago.estatus === 'pagado' ? 'PAGADO' : pago.estatus === 'pendiente' ? 'PENDIENTE' : 'VENCIDO'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

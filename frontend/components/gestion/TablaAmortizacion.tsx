'use client';

import React from 'react';
import { FilaAmortizacion } from '@/types/erp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download } from 'lucide-react';

interface TablaAmortizacionProps {
  amortizacion: FilaAmortizacion[];
}

export default function TablaAmortizacion({ amortizacion }: TablaAmortizacionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: es }) : 'Fecha inválida';
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Tabla de Amortización', 14, 22);

    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 14, 30);

    const tableData = amortizacion.map((pago) => [
      pago.numero_pago,
      formatDate(pago.fecha_vencimiento),
      formatCurrency(pago.cuota),
      formatCurrency(pago.interes),
      formatCurrency(pago.capital),
      formatCurrency(pago.saldo_restante),
      pago.estatus.toUpperCase(),
    ]);

    autoTable(doc, {
      head: [['No.', 'Fecha', 'Pago Total', 'Interés', 'Capital', 'Saldo', 'Estado']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [192, 86, 33] },
    });

    doc.save('tabla-amortizacion.pdf');
  };

  return (
    <div className="space-y-4" data-testid="tabla-amortizacion">
      <div className="flex justify-end">
        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-warm hover:bg-primary-dark transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm text-left text-muted-foreground">
          <thead className="text-xs text-foreground uppercase bg-background-paper">
            <tr>
              <th scope="col" className="px-6 py-3">
                No.
              </th>
              <th scope="col" className="px-6 py-3">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3">
                Monto
              </th>
              <th scope="col" className="px-6 py-3">
                Interés
              </th>
              <th scope="col" className="px-6 py-3">
                Capital
              </th>
              <th scope="col" className="px-6 py-3">
                Saldo
              </th>
              <th scope="col" className="px-6 py-3">
                Estatus
              </th>
            </tr>
          </thead>
          <tbody>
            {amortizacion.map((pago) => (
              <tr
                key={pago.numero_pago}
                className="bg-card border-b border-border hover:bg-background-subtle transition-colors"
              >
                <td className="px-6 py-4 font-medium text-foreground">{pago.numero_pago}</td>
                <td className="px-6 py-4">{formatDate(pago.fecha_vencimiento)}</td>
                <td className="px-6 py-4 font-mono text-foreground">{formatCurrency(pago.cuota)}</td>
                <td className="px-6 py-4 font-mono">{formatCurrency(pago.interes)}</td>
                <td className="px-6 py-4 font-mono">{formatCurrency(pago.capital)}</td>
                <td className="px-6 py-4 font-mono">{formatCurrency(pago.saldo_restante)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(pago.estatus)}`}
                  >
                    {pago.estatus.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {amortizacion.map((pago) => (
          <div
            key={pago.numero_pago}
            className="bg-card border border-border rounded-2xl p-4 shadow-card"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">
                  {formatDate(pago.fecha_vencimiento)}
                </p>
                <p className="font-medium text-foreground">Pago #{pago.numero_pago}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(pago.estatus)}`}
              >
                {pago.estatus.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground mb-3 bg-background-subtle p-3 rounded-xl border border-border/60">
              <div className="flex justify-between">
                <span>Capital:</span>
                <span className="text-foreground font-mono">{formatCurrency(pago.capital)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interés:</span>
                <span className="text-foreground font-mono">{formatCurrency(pago.interes)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 mt-2">
                <span>Saldo Restante:</span>
                <span className="text-foreground font-mono">
                  {formatCurrency(pago.saldo_restante)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Cuota Total</span>
              <span className="font-mono text-lg font-bold text-foreground">
                {formatCurrency(pago.cuota)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

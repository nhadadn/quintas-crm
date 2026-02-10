import React from 'react';
import { Pago, Venta } from '@/types/erp';
import { jsPDF } from 'jspdf';

interface GeneradorRecibosProps {
  pago: Pago;
  venta?: Venta;
  onGenerarPDF?: (url: string) => void;
}

export default function GeneradorRecibos({ pago, venta, onGenerarPDF }: GeneradorRecibosProps) {
  const generarRecibo = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(16, 185, 129); // Emerald-600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('RECIBO DE PAGO', pageWidth / 2, 25, { align: 'center' });

    // Info Empresa
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Quintas de Otinapa', 14, 50);
    doc.text('Carretera a Mazatlán Km 25', 14, 55);
    doc.text('Durango, Dgo. México', 14, 60);

    // Info Recibo
    doc.setFontSize(12);
    doc.text(`Folio: ${pago.folio || pago.referencia || pago.id || 'N/A'}`, 140, 50);
    doc.text(
      `Fecha: ${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-MX') : 'N/A'}`,
      140,
      55,
    );

    // Detalles
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 70, pageWidth - 14, 70);

    doc.setFontSize(14);
    doc.text(
      `Monto: $${pago.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
      14,
      85,
    );

    doc.setFontSize(12);
    doc.text(
      `Concepto: Pago de Lote ${
        venta && typeof venta.lote_id === 'object' && 'identificador' in venta.lote_id
          ? venta.lote_id.identificador
          : typeof venta?.lote_id === 'string'
            ? venta.lote_id
            : '---'
      }`,
      14,
      95,
    );
    doc.text(
      `Cliente: ${
        venta && typeof venta.cliente_id === 'object' && 'nombre' in venta.cliente_id
          ? `${venta.cliente_id.nombre} ${venta.cliente_id.apellido_paterno}`
          : typeof venta?.cliente_id === 'string'
            ? venta.cliente_id
            : '---'
      }`,
      14,
      105,
    );
    doc.text(
      `Forma de Pago: ${pago.metodo_pago ? pago.metodo_pago.toUpperCase() : 'N/A'}`,
      14,
      115,
    );

    // Footer
    doc.setFontSize(10);
    doc.text('Este documento es un comprobante de pago válido.', pageWidth / 2, 140, {
      align: 'center',
    });

    // Save or Open
    const pdfBlob = doc.output('bloburl');
    window.open(pdfBlob, '_blank');

    if (onGenerarPDF) {
      onGenerarPDF(pdfBlob.toString());
    }
  };

  return (
    <button
      onClick={generarRecibo}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors text-sm font-medium"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      Generar Recibo
    </button>
  );
}

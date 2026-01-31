import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Pago, Venta, Cliente, Lote } from '@/types/erp';
import { getPagoById } from '@/lib/pagos-api';

interface GeneradorRecibosProps {
  pago: Pago;
  onClose?: () => void;
}

export default function GeneradorRecibos({ pago, onClose }: GeneradorRecibosProps) {
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState<boolean>(false);

  const generarPDF = async (accion: 'descargar' | 'imprimir') => {
    if (!pago) return;
    setGenerando(true);

    try {
      const doc = new jsPDF();
      const venta = pago.venta_id as unknown as Venta;
      const cliente = venta?.cliente_id as unknown as Cliente;
      const lote = venta?.lote_id as unknown as Lote;

      // Configuración de fuentes y colores
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      
      // Título
      doc.text('RECIBO DE PAGO', 105, 20, { align: 'center' });
      
      // Logo (Placeholder texto por ahora, idealmente usar doc.addImage)
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('QUINTAS DE OTINAPA', 105, 30, { align: 'center' });
      doc.text('Desarrollo Inmobiliario Campestre', 105, 35, { align: 'center' });

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 40, 190, 40);

      // Información del Recibo
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLES DEL PAGO', 20, 50);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Folio de Pago: #${pago.numero_pago}`, 20, 60);
      doc.text(`Fecha de Pago: ${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'Pendiente'}`, 20, 66);
      doc.text(`Fecha Vencimiento: ${new Date(pago.fecha_vencimiento).toLocaleDateString()}`, 20, 72);
      doc.text(`Estatus: ${pago.estatus.toUpperCase()}`, 20, 78);

      // Información del Cliente
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CLIENTE', 110, 50);
      
      doc.setFont('helvetica', 'normal');
      if (cliente) {
        doc.text(`${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`, 110, 60);
        doc.text(`Email: ${cliente.email}`, 110, 66);
      } else {
        doc.text('Información de cliente no disponible', 110, 60);
      }

      // Información del Lote/Venta
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE LA PROPIEDAD', 20, 95);
      
      doc.setFont('helvetica', 'normal');
      if (lote) {
        doc.text(`Lote: ${lote.identificador || 'N/A'}`, 20, 105);
        // Asumiendo que lote tiene más datos si se trajeron
      }
      doc.text(`Venta ID: ${
        typeof pago.venta_id === 'object' && pago.venta_id !== null
          ? (pago.venta_id as Venta).id
          : pago.venta_id || 'N/A'
      }`, 20, 111);

      // Importes
      doc.setFillColor(245, 245, 245);
      doc.rect(20, 130, 170, 40, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`MONTO PAGADO: $${pago.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 105, 155, { align: 'center' });

      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Este recibo es un comprobante digital generado por el sistema Quintas CRM.', 105, 280, { align: 'center' });
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

      // Descargar o Imprimir
      if (accion === 'descargar') {
        doc.save(`recibo_${pago.numero_pago}_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      }

    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  };

  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!pago) return <div className="p-4 text-center">No se encontró el pago.</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Generar Recibo</h2>
      
      <div className="mb-6 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Pago #:</span>
          <span className="font-medium">{pago.numero_pago}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Monto:</span>
          <span className="font-medium text-green-600">${pago.monto_pagado.toLocaleString('es-MX')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fecha:</span>
          <span className="font-medium">
            {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'Pendiente'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => generarPDF('descargar')}
          disabled={generando || pago.estatus !== 'pagado'}
          className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
            ${pago.estatus !== 'pagado' 
              ? 'bg-gray-400 cursor-not-allowed' 
              : generando 
                ? 'bg-blue-400 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {generando ? 'Generando PDF...' : 'Descargar Recibo PDF'}
        </button>
        
        <button
          onClick={() => generarPDF('imprimir')}
          disabled={generando || pago.estatus !== 'pagado'}
          className={`w-full py-2 px-4 rounded-md text-gray-700 border border-gray-300 font-medium transition-colors
            ${pago.estatus !== 'pagado' 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'hover:bg-gray-50'
            }`}
        >
          Imprimir
        </button>
        
        {pago.estatus !== 'pagado' && (
          <p className="text-sm text-center text-amber-600">
            Solo se pueden generar recibos de pagos completados.
          </p>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}

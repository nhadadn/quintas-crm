import React, { useEffect, useState } from 'react';
import { FilaAmortizacion, EstatusPago } from '@/types/erp';
import { generarTablaAmortizacion } from '@/lib/pagos-api';

interface TablaAmortizacionProps {
  venta_id?: string;
  data?: FilaAmortizacion[];
}

const STATUS_STYLES: Record<EstatusPago, string> = {
  pagado: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800',
  pendiente: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800',
  atrasado: 'bg-red-900/30 text-red-400 border border-red-800',
  vencido: 'bg-red-900/30 text-red-400 border border-red-800',
};

export function TablaAmortizacion({ venta_id, data }: TablaAmortizacionProps) {
  const [tabla, setTabla] = useState<FilaAmortizacion[]>([]);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setTabla(data);
      setLoading(false);
      return;
    }

    const load = async () => {
      if (!venta_id) return;

      setLoading(true);
      try {
        const result = await generarTablaAmortizacion(venta_id);
        setTabla(result);
      } catch (e) {
        setError('Error al cargar la tabla de amortización');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [venta_id, data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDownloadPDF = () => {
    try {
      // Importación dinámica para evitar errores de SSR si fuera el caso,
      // aunque aquí es un evento de cliente.
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF();

      // Configuración general
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Tabla de Amortización', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 14, 28);

      // Configuración de tabla manual
      let yPos = 40;
      const xPositions = [14, 30, 60, 90, 120, 150, 180]; // Posiciones X para columnas
      const headers = ['No.', 'Vencimiento', 'Cuota', 'Interés', 'Capital', 'Saldo', 'Estatus'];

      // Dibujar cabecera
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPos - 5, 190, 8, 'F'); // Fondo gris para cabecera

      headers.forEach((header, i) => {
        doc.text(header, xPositions[i], yPos);
      });

      yPos += 8;

      // Dibujar filas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      tabla.forEach((fila, index) => {
        // Verificar si necesitamos nueva página
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
          // Repetir cabecera en nueva página
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(10, yPos - 5, 190, 8, 'F');
          headers.forEach((header, i) => {
            doc.text(header, xPositions[i], yPos);
          });
          yPos += 8;
          doc.setFont('helvetica', 'normal');
        }

        // Alternar color de fondo para filas
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(10, yPos - 5, 190, 8, 'F');
        }

        doc.text(String(fila.numero_pago), xPositions[0], yPos);
        doc.text(formatDate(fila.fecha_vencimiento), xPositions[1], yPos);
        doc.text(formatCurrency(fila.cuota), xPositions[2], yPos);
        doc.text(formatCurrency(fila.interes), xPositions[3], yPos);
        doc.text(formatCurrency(fila.capital), xPositions[4], yPos);
        doc.text(formatCurrency(fila.saldo_restante), xPositions[5], yPos);
        doc.text(fila.estatus.toUpperCase(), xPositions[6], yPos);

        yPos += 7;
      });

      // Totales
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALES:', xPositions[1], yPos);
      doc.text(formatCurrency(tabla.reduce((sum, f) => sum + f.cuota, 0)), xPositions[2], yPos);
      doc.text(formatCurrency(tabla.reduce((sum, f) => sum + f.interes, 0)), xPositions[3], yPos);
      doc.text(formatCurrency(tabla.reduce((sum, f) => sum + f.capital, 0)), xPositions[4], yPos);

      doc.save('tabla_amortizacion.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Hubo un error al generar el PDF.');
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-700">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-emerald-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-slate-400 text-sm">Calculando tabla de amortización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="p-6 border-b border-slate-700 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Tabla de Amortización</h3>
          <p className="text-slate-400 text-sm mt-1">Desglose de pagos y saldos</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Descargar PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/50 text-slate-300 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">No.</th>
              <th className="px-6 py-4">Vencimiento</th>
              <th className="px-6 py-4 text-right">Cuota</th>
              <th className="px-6 py-4 text-right">Interés</th>
              <th className="px-6 py-4 text-right">Capital</th>
              <th className="px-6 py-4 text-right">Saldo</th>
              <th className="px-6 py-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {tabla.map((fila) => (
              <tr key={fila.numero_pago} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white">#{fila.numero_pago}</td>
                <td className="px-6 py-4 text-slate-300">{formatDate(fila.fecha_vencimiento)}</td>
                <td className="px-6 py-4 text-right font-medium text-white">
                  {formatCurrency(fila.cuota)}
                </td>
                <td className="px-6 py-4 text-right text-slate-300">
                  {formatCurrency(fila.interes)}
                </td>
                <td className="px-6 py-4 text-right text-slate-300">
                  {formatCurrency(fila.capital)}
                </td>
                <td className="px-6 py-4 text-right text-slate-300">
                  {formatCurrency(fila.saldo_restante)}
                </td>
                <td className="px-6 py-4 flex justify-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[fila.estatus]}`}
                  >
                    {fila.estatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900/50 text-slate-300 font-semibold border-t border-slate-700">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-right">
                Totales:
              </td>
              <td className="px-6 py-4 text-right text-emerald-400">
                {formatCurrency(tabla.reduce((sum, f) => sum + f.cuota, 0))}
              </td>
              <td className="px-6 py-4 text-right text-slate-300">
                {formatCurrency(tabla.reduce((sum, f) => sum + f.interes, 0))}
              </td>
              <td className="px-6 py-4 text-right text-slate-300">
                {formatCurrency(tabla.reduce((sum, f) => sum + f.capital, 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

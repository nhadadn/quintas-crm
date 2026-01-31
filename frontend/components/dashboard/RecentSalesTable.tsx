import React from 'react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface VentaReciente {
  id: string | number;
  lote: string;
  cliente: string;
  fecha: string;
  monto: number;
  estatus: string;
}

export interface RecentSalesTableProps {
  ventas: VentaReciente[];
}

export function RecentSalesTable({ ventas }: RecentSalesTableProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-100">Ventas Recientes</h3>
        <Link href="/ventas" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium">
          Ver todas
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
            <tr>
              <th className="px-6 py-3">Lote</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Monto</th>
              <th className="px-6 py-3">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((venta) => (
              <tr key={venta.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-100">{venta.lote}</td>
                <td className="px-6 py-4">{venta.cliente}</td>
                <td className="px-6 py-4">
                  {isValid(new Date(venta.fecha))
                    ? format(new Date(venta.fecha), 'dd/MM/yyyy', { locale: es })
                    : 'Fecha inválida'}
                </td>
                <td className="px-6 py-4">
                  {venta.monto.toLocaleString('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                    minimumFractionDigits: 2
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${venta.estatus === 'pagado' ? 'bg-emerald-900/50 text-emerald-400' : 
                      venta.estatus === 'pendiente' ? 'bg-amber-900/50 text-amber-400' : 
                      'bg-slate-700 text-slate-300'}`}>
                    {venta.estatus.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay ventas recientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

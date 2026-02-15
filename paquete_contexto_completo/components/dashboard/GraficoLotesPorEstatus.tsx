import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { LotesPorEstatus } from '@/types/dashboard';

interface GraficoLotesPorEstatusProps {
  data: LotesPorEstatus[];
}

const COLORS = {
  disponible: '#22c55e', // Verde
  apartado: '#f59e0b', // Naranja
  vendido: '#3b82f6', // Azul
  contratado: '#6366f1', // Indigo
  liquidado: '#8b5cf6', // Violeta
  bloqueado: '#ef4444', // Rojo
};

export function GraficoLotesPorEstatus({ data }: GraficoLotesPorEstatusProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-lg text-sm">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 capitalize">
            {data.estatus || 'Desconocido'}
          </p>
          <div className="space-y-1">
            <p className="text-slate-600 dark:text-slate-300">{data.cantidad} lotes</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Valor: ${(data.valor_total ?? 0).toLocaleString()}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Área: {(data.area_total ?? 0).toLocaleString()} m²
            </p>
            <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              {data.porcentaje_ocupacion}% del total
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">
        Estado del Inventario
      </h3>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis
              dataKey="estatus"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
            <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} barSize={50} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.estatus as keyof typeof COLORS] || '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
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
import { VentasPorVendedor } from '@/types/dashboard';

interface GraficoVentasPorVendedorProps {
  data: VentasPorVendedor[];
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
];

export function GraficoVentasPorVendedor({ data }: GraficoVentasPorVendedorProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-lg text-sm z-50">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{data.nombre}</p>
          <div className="space-y-1">
            <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
              Total: ${data.monto_total.toLocaleString()}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{data.total_ventas} ventas</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs">
              Comisiones: ${data.comisiones_generadas.toLocaleString()}
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
        Top Vendedores
      </h3>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
              stroke="#e2e8f0"
              opacity={0.5}
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="nombre"
              type="category"
              width={100}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.3 }} />
            <Bar
              dataKey="monto_total"
              radius={[0, 4, 4, 0]}
              barSize={20}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={hoveredIndex === index || hoveredIndex === null ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

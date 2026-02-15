import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PagosPorEstatus } from '@/types/dashboard';

interface GraficoPagosPorEstatusProps {
  data: PagosPorEstatus[];
}

const COLORS = {
  pagado: '#22c55e', // Verde
  pendiente: '#eab308', // Amarillo
  atrasado: '#ef4444', // Rojo
};

const LABELS = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  atrasado: 'Atrasado',
};

export function GraficoPagosPorEstatus({ data }: GraficoPagosPorEstatusProps) {
  // Asegurar que tenemos todos los estados para los colores
  const processedData = data.map((item) => ({
    ...item,
    name: LABELS[item.estatus] || item.estatus,
    value: item.cantidad,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-lg text-sm">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{data.name}</p>
          <div className="space-y-1">
            <p className="text-slate-600 dark:text-slate-300">{data.value} pagos</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Monto: ${(data.monto_total || 0).toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        Estatus de Pagos
      </h3>

      <div className="flex-1 min-h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.estatus as keyof typeof COLORS] || '#cbd5e1'}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del Donut */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {processedData.reduce((acc, curr) => acc + curr.value, 0)}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Pagos</p>
        </div>
      </div>
    </div>
  );
}

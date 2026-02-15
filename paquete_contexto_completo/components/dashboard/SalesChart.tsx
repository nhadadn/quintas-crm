import React from 'react';

export interface SalesChartProps {
  data: { label: string; value: number }[];
  title: string;
}

export function SalesChart({ data, title }: SalesChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">{title}</h3>
      <div className="flex items-end justify-between h-64 gap-2">
        {data.map((item, index) => {
          const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center flex-1 group">
              <div className="relative w-full flex justify-center h-full items-end">
                <div
                  className="w-full max-w-[40px] bg-emerald-600 rounded-t-sm transition-all duration-500 hover:bg-emerald-500 relative"
                  style={{ height: `${heightPercentage}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-slate-700">
                    ${item.value.toLocaleString('es-MX')}
                  </div>
                </div>
              </div>
              <span className="mt-2 text-xs text-slate-400 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

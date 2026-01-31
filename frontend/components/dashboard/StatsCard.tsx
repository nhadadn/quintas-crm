import React from 'react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, change, changeType = 'neutral', icon }: StatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-emerald-500';
      case 'negative': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
        </div>
        {icon && (
          <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300">
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-medium ${getChangeColor()}`}>
            {change}
          </span>
          <span className="text-slate-500 ml-2">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}

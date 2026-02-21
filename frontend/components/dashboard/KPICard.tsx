import React from 'react';
import { ArrowUp, ArrowDown, HelpCircle, Minus } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: number; // Porcentaje
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
}

export function KPICard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  tooltip,
  prefix = '',
  suffix = '',
}: KPICardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-500';
      case 'down':
        return 'text-rose-500';
      default:
        return 'text-slate-400';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 mr-1" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 mr-1" />;
      default:
        return <Minus className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-warm-hover transition-all duration-300 group relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>
          {tooltip && (
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-slate-900 text-white text-xs rounded p-2 z-10 shadow-lg text-center">
                {tooltip}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-background-subtle rounded-xl text-primary-light shadow-sm">
            {icon}
          </div>
        )}
      </div>

      <h3 className="text-2xl font-semibold tracking-tight leading-tight text-foreground transition-all duration-500">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </h3>

      {change !== undefined && (
        <div className={`mt-3 flex items-center text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-semibold">{Math.abs(change)}%</span>
          <span className="text-slate-400 dark:text-slate-500 ml-2 text-xs">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}

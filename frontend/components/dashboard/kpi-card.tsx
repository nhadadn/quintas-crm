'use client';
import { cn } from '@/lib/utils';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

type SparkPoint = { x: number; y: number };

export type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  spark?: SparkPoint[];
  status?: 'neutral' | 'up' | 'down' | 'alert';
  className?: string;
};

export default function KpiCard({
  title,
  value,
  hint,
  spark,
  status = 'neutral',
  className,
}: KpiCardProps) {
  const statusColor =
    status === 'up'
      ? 'hsl(var(--primary))'
      : status === 'down'
        ? 'hsl(var(--destructive))'
        : status === 'alert'
          ? 'hsl(var(--accent))'
          : 'hsl(var(--muted))';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border border-border bg-card p-5 shadow-card transition-transform duration-150',
        'hover:shadow-warm-hover hover:scale-[1.02] focus-within:shadow-warm',
        className,
      )}
      tabIndex={0}
      aria-label={title}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold text-foreground font-sans">{value}</div>
        </div>
        <div className="h-10 w-16">
          {spark && spark.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Tooltip contentStyle={{ display: 'none' }} />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={statusColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyPoint = { label: string; value: number };

export function MonthlyRevenueArea({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-card">
      <div className="mb-2 text-xl font-semibold text-text-primary tracking-tight">Ingresos mensuales</div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted))" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#primaryGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

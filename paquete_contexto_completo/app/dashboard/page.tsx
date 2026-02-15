import { Metadata } from 'next';
import DashboardPrincipal from '@/components/dashboard/DashboardPrincipal';

export const metadata: Metadata = {
  title: 'Dashboard - Quintas CRM',
  description: 'Vista general del estado del negocio',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard Principal</h1>
        <p className="text-slate-400">Resumen general de rendimiento y KPIs</p>
      </div>
      <DashboardPrincipal />
    </div>
  );
}

import { auth } from '@/lib/auth';
import { getApps, getWebhooks } from '@/lib/developer-portal-api';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, AppWindow, Webhook, Activity, AlertTriangle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';

import { RequestsChart } from '@/components/developer-portal/RequestsChart';

export default async function DeveloperPortalPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  const apps = await getApps(session.accessToken);
  const webhooks = await getWebhooks(session.accessToken);

  // Mocked stats for now
  const requestsCount = 1250;
  const errorRate = '0.5%';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard de Desarrollador</h1>
        <Link
          href="/developer-portal/apps/new"
          className="bg-primary hover:bg-primary-dark text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium shadow-warm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva App
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Mis Apps"
          value={apps.length.toString()}
          icon={<AppWindow className="w-5 h-5" />}
        />
        <StatsCard
          title="Webhooks Activos"
          value={webhooks.filter((w: any) => w.is_active).length.toString()}
          icon={<Webhook className="w-5 h-5" />}
        />
        <StatsCard
          title="Requests (7d)"
          value={requestsCount.toString()}
          icon={<Activity className="w-5 h-5" />}
          change="+12%"
          changeType="positive"
        />
        <StatsCard
          title="Error Rate"
          value={errorRate}
          icon={<AlertTriangle className="w-5 h-5" />}
          change="-0.1%"
          changeType="positive"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Actividad de API (Últimos 7 días)
        </h3>
        <RequestsChart />
      </div>
    </div>
  );
}

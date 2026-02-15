import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewWebhookForm } from '@/components/developer-portal/NewWebhookForm';
import { getApps } from '@/lib/developer-portal-api';

export default async function NewWebhookPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  const apps = await getApps(session.accessToken);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100">Crear Nuevo Webhook</h1>
        <p className="text-slate-400">
          Recibe notificaciones en tiempo real cuando ocurran eventos importantes.
        </p>
      </div>

      <NewWebhookForm apps={apps} />
    </div>
  );
}

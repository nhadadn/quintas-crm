import { auth } from '@/lib/auth';
import { getWebhooks } from '@/lib/developer-portal-api';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Webhook, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  const webhooks = await getWebhooks(session.accessToken);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Webhooks</h1>
        <Link
          href="/developer-portal/webhooks/new"
          className="bg-primary hover:bg-primary-dark text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium shadow-warm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Webhook
        </Link>
      </div>

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No tienes webhooks configurados</h3>
            <p className="text-slate-500 mt-2">
              Configura webhooks para recibir notificaciones en tiempo real.
            </p>
          </div>
        ) : (
          webhooks.map((webhook: any) => (
            <div key={webhook.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded text-sm">
                      {webhook.event_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${webhook.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                      {webhook.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <h3 className="text-slate-300 font-mono text-sm break-all">{webhook.url}</h3>
                </div>
              </div>

              <div className="mt-4 flex gap-6 text-sm text-slate-400 border-t border-slate-800 pt-4">
                <div>
                  <span className="block text-xs text-slate-500 uppercase">Último Éxito</span>
                  <div className="flex items-center gap-1">
                    {webhook.last_success_at ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        {format(new Date(webhook.last_success_at), 'dd/MM/yyyy HH:mm')}
                      </>
                    ) : (
                      'Nunca'
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 uppercase">Último Fallo</span>
                  <div className="flex items-center gap-1">
                    {webhook.last_failure_at ? (
                      <>
                        <XCircle className="w-3 h-3 text-red-500" />
                        {format(new Date(webhook.last_failure_at), 'dd/MM/yyyy HH:mm')}
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 uppercase">
                    Fallos Consecutivos
                  </span>
                  <span className={webhook.failure_count > 0 ? 'text-red-400' : 'text-slate-400'}>
                    {webhook.failure_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

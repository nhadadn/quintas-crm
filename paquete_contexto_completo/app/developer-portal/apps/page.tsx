import { auth } from '@/lib/auth';
import { getApps } from '@/lib/developer-portal-api';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, AppWindow, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default async function AppsPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  const apps = await getApps(session.accessToken);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Mis Aplicaciones</h1>
        <Link
          href="/developer-portal/apps/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar App
        </Link>
      </div>

      <div className="grid gap-4">
        {apps.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <AppWindow className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">
              No tienes aplicaciones registradas
            </h3>
            <p className="text-slate-500 mt-2">
              Registra tu primera aplicación para obtener credenciales de API.
            </p>
          </div>
        ) : (
          apps.map((app: any) => (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{app.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded">
                    ID: {app.client_id}
                  </span>
                  <span>
                    Creada: {format(new Date(app.date_created || new Date()), 'dd/MM/yyyy')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${app.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                  >
                    {app.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/developer-portal/apps/${app.client_id}`}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Ver detalles"
                >
                  <Eye className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

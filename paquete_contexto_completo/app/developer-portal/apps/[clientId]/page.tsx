import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAppDetails } from '@/lib/developer-portal-api';
import { AppDetail } from '@/components/developer-portal/AppDetail';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function AppDetailsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  const { clientId } = await params;

  const app = await getAppDetails(session.accessToken, clientId);

  if (!app) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-slate-100">Aplicación no encontrada</h3>
        <p className="text-slate-400 mt-2">
          No se encontró la aplicación solicitada o no tienes permisos para verla.
        </p>
        <Link
          href="/developer-portal/apps"
          className="inline-block mt-4 text-blue-400 hover:text-blue-300"
        >
          Volver a mis aplicaciones
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/developer-portal/apps"
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{app.name}</h1>
          <p className="text-slate-400 text-sm">Detalles y credenciales de la aplicación</p>
        </div>
      </div>

      <AppDetail app={app} />
    </div>
  );
}

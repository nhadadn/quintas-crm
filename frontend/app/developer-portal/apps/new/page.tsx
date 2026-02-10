import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewAppForm } from '@/components/developer-portal/NewAppForm';

export default async function NewAppPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/portal/auth/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100">Registrar Nueva Aplicación</h1>
        <p className="text-slate-400">Obtén credenciales OAuth 2.0 para integrar tu sistema.</p>
      </div>

      <NewAppForm />
    </div>
  );
}

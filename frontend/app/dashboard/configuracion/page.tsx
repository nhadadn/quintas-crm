import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listVendedoresForConfig } from '@/lib/vendedores-api';
import TablaVendedores from '@/components/configuracion/TablaVendedores';

export const metadata: Metadata = {
  title: 'Configuración - Quintas CRM',
  description: 'Gestión de Vendedores y ajustes del sistema',
};

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/portal/auth/login');
  }
  const role = session.user.role;
  if (role === 'Vendedor') {
    redirect('/dashboard/ventas');
  }
  if (role !== 'Administrator') {
    redirect('/dashboard');
  }

  // Preferir Static Token para permisos elevados; fallback al token de sesión (rol Admin)
  const adminToken = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
  const vendedores = await listVendedoresForConfig(adminToken || (session.accessToken as string));

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Configuración · Gestión de Vendedores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea y administra vendedores, cuentas de acceso y estados.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <TablaVendedores initialVendedores={vendedores} />
      </div>
    </div>
  );
}

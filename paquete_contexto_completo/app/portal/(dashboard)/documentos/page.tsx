import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPerfilCliente } from '@/lib/perfil-api';
import { obtenerDocumentosDePerfil } from '@/lib/documentos-api';
import { TablaDocumentosCliente } from '@/components/portal/documentos/TablaDocumentosCliente';
import { FileText } from 'lucide-react';

export default async function DocumentosPage() {
  const session = await auth();

  if (!session) {
    redirect('/portal/auth/login');
  }

  // Si es Administrador o Vendedor, redirigir al Dashboard administrativo
  const role = session.user?.role || '';
  if (['Administrator', 'Vendedor', 'admin', 'Admin'].includes(role)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Vista de Documentos ({role})
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Como administrador/vendedor, no tienes documentos personales. Por favor, utiliza el
            Dashboard Administrativo para gestionar documentos de clientes.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ir al Dashboard Administrativo
          </a>
        </div>
      </div>
    );
  }

  let documentos = [];
  try {
    const perfilData = await getPerfilCliente(session.accessToken);
    documentos = obtenerDocumentosDePerfil(perfilData.perfil);
  } catch (error) {
    console.error('Error fetching documents:', error);
    // Handle error appropriately, maybe show empty state or error message
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary-light" />
            Mis Documentos
          </h1>
          <p className="text-slate-400 mt-1">
            Consulta y descarga tus contratos, recibos y estados de cuenta.
          </p>
        </div>
      </div>

      <TablaDocumentosCliente documentos={documentos} />
    </div>
  );
}

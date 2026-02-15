import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ConsentForm from '@/components/oauth/ConsentForm';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Si no hay sesión, redirigir al login y volver aquí después
    const returnUrl = `/oauth/consent?${new URLSearchParams(searchParams as any).toString()}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  const client_id = searchParams.client_id as string;
  const redirect_uri = searchParams.redirect_uri as string;
  const scope = searchParams.scope as string;
  const state = searchParams.state as string;
  const app_name = searchParams.app_name as string;

  if (!client_id || !redirect_uri) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-bold text-red-600">Error de Solicitud</h1>
          <p className="text-gray-600">Faltan parámetros requeridos para la autorización.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div>Cargando...</div>}>
        <ConsentForm
          appName={app_name || 'Aplicación Externa'}
          scopes={scope ? scope.split(' ') : []}
          clientId={client_id}
          redirectUri={redirect_uri}
          state={state}
        />
      </Suspense>
    </div>
  );
}

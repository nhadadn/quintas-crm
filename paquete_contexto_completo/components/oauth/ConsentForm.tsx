'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { directusClient } from '@/lib/directus-api'; // Asegúrate de tener un cliente de API configurado

interface ConsentFormProps {
  appName: string;
  scopes: string[];
  clientId: string;
  redirectUri: string;
  state: string;
}

export default function ConsentForm({
  appName,
  scopes,
  clientId,
  redirectUri,
  state,
}: ConsentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorize = async (approve: boolean) => {
    setLoading(true);
    setError(null);

    try {
      // Llamada al endpoint POST /oauth/authorize de Directus
      // Necesitamos pasar el token de sesión actual
      // Asumimos que hay una función auxiliar para hacer requests autenticados a Directus
      // O usamos fetch directamente contra la API de Directus

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Incluir token de autorización si es necesario, aunque idealmente la sesión se maneja via cookies/headers
          // 'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scopes.join(' '),
          state: state,
          approve: approve,
        }),
      });

      const data = await response.json();

      if (data.redirect_to) {
        window.location.href = data.redirect_to;
      } else if (data.error) {
        setError(data.error_description || 'Ocurrió un error durante la autorización.');
      }
    } catch (err) {
      console.error('Error authorizing:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Autorización de Acceso</CardTitle>
        <CardDescription className="text-center">
          La aplicación <span className="font-semibold text-primary">{appName}</span> solicita
          conectarse a tu cuenta de Quintas CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-blue-800">Esta aplicación podrá:</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            {scopes.length > 0 ? (
              scopes.map((scope) => (
                <li key={scope} className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                  <span>{formatScope(scope)}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start">
                <CheckCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                <span>Acceder a tu información básica de perfil</span>
              </li>
            )}
          </ul>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Serás redirigido a: <br />
          <span className="font-mono">{redirectUri}</span>
        </div>

        {error && (
          <div className="flex items-center rounded-md bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="mr-2 h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          onClick={() => handleAuthorize(false)}
          disabled={loading}
          className="w-full sm:w-1/2"
        >
          Cancelar
        </Button>
        <Button
          onClick={() => handleAuthorize(true)}
          disabled={loading}
          className="w-full sm:w-1/2"
        >
          {loading ? 'Procesando...' : 'Autorizar'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function formatScope(scope: string): string {
  const scopeMap: Record<string, string> = {
    'read:lotes': 'Ver disponibilidad de lotes',
    'read:ventas': 'Ver información de ventas',
    'write:ventas': 'Crear y modificar ventas',
    'read:profile': 'Ver tu perfil de usuario',
    offline_access: 'Mantener acceso cuando no estés en línea',
  };
  return scopeMap[scope] || scope;
}

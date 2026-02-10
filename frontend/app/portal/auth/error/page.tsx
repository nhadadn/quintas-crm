'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

enum ErrorType {
  Configuration = 'Configuration',
  AccessDenied = 'AccessDenied',
  Verification = 'Verification',
  Default = 'Default',
}

const errorMap = {
  [ErrorType.Configuration]: {
    title: 'Error de Configuración',
    message: 'Hubo un problema con la configuración del servidor. Por favor, contacta al soporte.',
  },
  [ErrorType.AccessDenied]: {
    title: 'Acceso Denegado',
    message: 'No tienes permiso para acceder a este recurso.',
  },
  [ErrorType.Verification]: {
    title: 'Error de Verificación',
    message:
      'El enlace de inicio de sesión ya no es válido. Puede que ya haya sido utilizado o haya expirado.',
  },
  [ErrorType.Default]: {
    title: 'Algo salió mal',
    message: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
  },
};

import { AuthCard } from '@/components/portal/auth/AuthCard';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') as ErrorType;

  const { title, message } = errorMap[error] || errorMap[ErrorType.Default];

  return (
    <AuthCard title={title} subtitle={message}>
      <div className="mt-6 text-center">
        <Link
          href="/portal/auth/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthCard>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ErrorContent />
    </Suspense>
  );
}

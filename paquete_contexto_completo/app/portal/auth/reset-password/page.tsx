import Link from 'next/link';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { AuthCard } from '@/components/portal/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | Portal de Clientes',
};

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Restablecer Contraseña" subtitle="Ingresa tu nueva contraseña a continuación.">
      <div className="mt-8">
        <Suspense fallback={<div>Cargando formulario...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <div className="mt-6 text-center text-sm">
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

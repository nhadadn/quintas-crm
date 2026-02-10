import PortalLoginForm from '@/components/auth/PortalLoginForm';
import { AuthCard } from '@/components/portal/auth/AuthCard';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Portal de Clientes',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AuthCard
        title="Bienvenido a tu Portal"
        subtitle="Accede a tu información de lotes, pagos y documentos"
      >
        <PortalLoginForm />
      </AuthCard>
    </Suspense>
  );
}

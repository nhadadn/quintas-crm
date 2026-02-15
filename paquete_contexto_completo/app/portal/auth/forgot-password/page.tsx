import Link from 'next/link';
import { Metadata } from 'next';
import RecoverPasswordForm from '@/components/auth/RecoverPasswordForm';
import { AuthCard } from '@/components/portal/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Recuperar Contraseña | Portal de Clientes',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar Contraseña"
      subtitle="Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña."
    >
      <div className="mt-8">
        <RecoverPasswordForm />
      </div>

      <div className="mt-6 text-center text-sm">
        <Link
          href="/portal/auth/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Volver al login
        </Link>
      </div>
    </AuthCard>
  );
}

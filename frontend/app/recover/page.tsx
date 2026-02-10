import RecoverPasswordForm from '@/components/auth/RecoverPasswordForm';
import Link from 'next/link';

export default function RecoverPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <h1 className="text-2xl font-bold">Quintas CRM</h1>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8 shadow-md">
          <h2 className="mb-3 text-xl font-bold text-gray-900">Recuperar Contraseña</h2>
          <p className="mb-4 text-sm text-gray-600">
            Ingresa tu correo electrónico para recibir instrucciones.
          </p>
          <RecoverPasswordForm />
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-blue-500 hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

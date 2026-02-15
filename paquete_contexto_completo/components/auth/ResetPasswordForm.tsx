'use client';

import { resetPassword } from '@/lib/auth-actions';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { PasswordField } from '@/components/portal/auth/PasswordField';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ResetPasswordForm() {
  const [state, setState] = useState<{ success: boolean; message: string } | undefined>();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (state?.success) {
      // Redirigir al login después de 2 segundos si fue exitoso
      const timer = setTimeout(() => {
        router.push('/portal/auth/login?reset=success');
      }, 2000);
      return () => clearTimeout(timer);
    } else if (state?.message) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await resetPassword(undefined, formData);
        if (result) setState(result);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))
        ) {
          throw error;
        }
        setState({ success: false, message: 'Error inesperado' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
      <input type="hidden" name="token" value={token || ''} />

      <div className="space-y-4">
        <div>
          <PasswordField
            id="password"
            name="password"
            label="Nueva Contraseña"
            required
            placeholder="Nueva Contraseña"
          />
        </div>
        <div>
          <PasswordField
            id="confirm-password"
            name="confirm-password"
            label="Confirmar Contraseña"
            required
            placeholder="Confirmar Contraseña"
          />
        </div>
      </div>

      {state?.message && (
        <div
          className={`flex items-center p-4 text-sm rounded-lg animate-fade-in ${state.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
        >
          {state.success ? (
            <CheckCircle className="flex-shrink-0 w-4 h-4 me-3" />
          ) : (
            <AlertCircle className="flex-shrink-0 w-4 h-4 me-3" />
          )}
          <div>{state.message}</div>
        </div>
      )}

      <div>
        <SubmitButton pending={isPending} />
      </div>
    </form>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all duration-200"
    >
      {pending ? 'Cambiando...' : 'Cambiar Contraseña'}
    </button>
  );
}

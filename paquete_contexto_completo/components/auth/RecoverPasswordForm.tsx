'use client';

import { useState, useTransition } from 'react';
import { requestPasswordReset } from '@/lib/auth-actions';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function RecoverPasswordForm() {
  const [state, setState] = useState<{ success: boolean; message: string } | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(undefined);

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(undefined, formData);
        if (result) setState(result);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))
        ) {
          throw error;
        }
        setState({ success: false, message: 'Ocurrió un error inesperado' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="email">
          Email registrado
        </label>
        <div className="mt-2">
          <input
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            id="email"
            type="email"
            name="email"
            placeholder="ejemplo@correo.com"
            required
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

      <SubmitButton pending={isPending} />
    </form>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all duration-200"
      disabled={pending}
    >
      {pending ? 'Enviando...' : 'Enviar enlace de recuperación'}
    </button>
  );
}

'use client';

import { useState, useTransition, useEffect } from 'react';
import { authenticate } from '@/lib/auth-actions';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactivity') {
      setErrorMessage(
        'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.',
      );
    }
  }, [searchParams]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrorMessage(undefined);

    startTransition(async () => {
      try {
        const result = await authenticate(undefined, formData);
        if (result) {
          setErrorMessage(result);
        } else {
          // Success
          router.push('/dashboard');
          router.refresh();
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrorMessage('Error inesperado');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <input
            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
            id="email"
            type="email"
            name="email"
            placeholder="Introduce tu email"
            required
          />
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor="password">
          Contraseña
        </label>
        <div className="relative">
          <input
            className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
            id="password"
            type="password"
            name="password"
            placeholder="Introduce tu contraseña"
            required
            minLength={6}
          />
        </div>
      </div>
      <div className="flex h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </div>
      <LoginButton pending={isPending} />
    </form>
  );
}

function LoginButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      className="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
    </button>
  );
}

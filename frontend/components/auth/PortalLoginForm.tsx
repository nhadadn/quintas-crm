'use client';

import { useTransition, useEffect, useState } from 'react';
import { authenticate } from '@/lib/auth-actions';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordField } from '@/components/portal/auth/PasswordField';
import { AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  'remember-me': z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function PortalLoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [shake, setShake] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      'remember-me': false,
    },
  });

  // Debug errors
  // useEffect(() => {
  //   if (Object.keys(errors).length > 0) {
  //     const simplifiedErrors = Object.keys(errors).reduce((acc, key) => {
  //       acc[key] = errors[key]?.message;
  //       return acc;
  //     }, {} as Record<string, string | undefined>);
  //     console.log('[PortalLoginForm] Validation errors:', simplifiedErrors);
  //     console.log('[PortalLoginForm] Current values:', getValues());
  //   }
  // }, [errors, getValues]);

  useEffect(() => {
    if (errorMessage) {
      // console.log('[PortalLoginForm] Server error:', errorMessage);
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const onSubmit = (data: LoginFormValues) => {
    console.log('[PortalLoginForm] Submitting form data:', data);
    setErrorMessage(undefined);
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data['remember-me']) {
      formData.append('remember-me', 'on');
    }
    
    startTransition(async () => {
      try {
        const result = await authenticate(undefined, formData);
        if (result) {
          setErrorMessage(result);
        } else {
          // Success - Redirect manually
          let callbackUrl = searchParams.get('callbackUrl') || '/portal';
          // Evitar redirigir al login si por alguna razón está en el callbackUrl
          if (callbackUrl.includes('/auth/login')) {
             callbackUrl = '/portal';
          }
          router.push(callbackUrl);
          router.refresh();
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrorMessage('Ocurrió un error inesperado');
      }
    });
    console.log('[PortalLoginForm] Dispatch called');
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className={`mt-8 space-y-6 ${shake ? 'animate-shake' : ''}`}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
            Email
          </label>
          <div className="mt-2">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                errors.email ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300'
              }`}
              placeholder="nombre@ejemplo.com"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <PasswordField
            id="password"
            label="Contraseña"
            autoComplete="current-password"
            required
            className={errors.password ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300'}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            {...register('remember-me')}
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Recordarme
          </label>
        </div>

        <div className="text-sm">
          <Link
            href="/portal/auth/forgot-password"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      <div>
        <LoginButton loading={isSubmitting || isPending} />
      </div>

      {errorMessage && (
        <div
          className="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="flex-shrink-0 inline w-4 h-4 me-3" />
          <span className="sr-only">Error</span>
          <div>{errorMessage}</div>
        </div>
      )}
    </form>
  );
}

function LoginButton({ loading }: { loading?: boolean }) {
  return (
    <button
      type="submit"
      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all duration-200"
      disabled={loading}
    >
      {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
    </button>
  );
}

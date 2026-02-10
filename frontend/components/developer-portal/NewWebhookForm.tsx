'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createWebhook } from '@/lib/actions/developer-portal';
import { Loader2, AlertCircle } from 'lucide-react';

interface App {
  id: string;
  name: string;
}

interface NewWebhookFormProps {
  apps: App[];
}

interface FormData {
  app: string;
  url: string;
  event_type: string;
}

const EVENT_TYPES = [
  { value: 'sale.created', label: 'Venta Creada' },
  { value: 'sale.updated', label: 'Venta Actualizada' },
  { value: 'payment.received', label: 'Pago Recibido' },
  { value: 'customer.created', label: 'Cliente Registrado' },
];

export function NewWebhookForm({ apps }: NewWebhookFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setError(null);

    // Si no se selecciona app, usar la primera disponible o manejar error
    // En este caso asumimos que el usuario selecciona una app si hay varias,
    // o si es un developer portal simple, quizás el webhook se asocia al usuario directamente.
    // Pero la estructura sugiere asociar a una App (Client ID).
    // Revisando el backend, el webhook se asocia a la App.

    const res = await createWebhook({
      ...data,
      // Si el backend espera 'app' como ID de la app oauth_clients
    });

    if (res.success) {
      router.push('/developer-portal/webhooks');
      router.refresh();
    } else {
      setError(res.error || 'Error al crear el webhook');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Aplicación</label>
        <select
          {...register('app', { required: 'Selecciona una aplicación' })}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Seleccionar aplicación...</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
        {errors.app && <p className="text-red-400 text-xs mt-1">{errors.app.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">URL del Webhook</label>
        <input
          {...register('url', {
            required: 'La URL es obligatoria',
            pattern: {
              value: /^https?:\/\/.+/,
              message: 'Debe ser una URL válida (http/https)',
            },
          })}
          placeholder="https://api.tu-sistema.com/webhooks"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        {errors.url && <p className="text-red-400 text-xs mt-1">{errors.url.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Evento</label>
        <select
          {...register('event_type', { required: 'Selecciona un evento' })}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Seleccionar evento...</option>
          {EVENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} ({type.value})
            </option>
          ))}
        </select>
        {errors.event_type && (
          <p className="text-red-400 text-xs mt-1">{errors.event_type.message}</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          Crear Webhook
        </button>
      </div>
    </form>
  );
}

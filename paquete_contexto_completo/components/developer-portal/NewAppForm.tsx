'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { registerApp } from '@/lib/actions/developer-portal';
import { Loader2, AlertCircle, Plus, X } from 'lucide-react';

interface FormData {
  name: string;
  redirect_uris: string;
  scopes: string[];
}

const AVAILABLE_SCOPES = [
  { value: 'read_products', label: 'Leer Productos' },
  { value: 'read_orders', label: 'Leer Ventas' },
  { value: 'write_orders', label: 'Crear Ventas' },
  { value: 'read_customers', label: 'Leer Clientes' },
  { value: 'write_customers', label: 'Modificar Clientes' },
];

export function NewAppForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uris, setUris] = useState<string[]>([]);
  const [currentUri, setCurrentUri] = useState('');

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>();

  const handleAddUri = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUri && !uris.includes(currentUri)) {
      try {
        new URL(currentUri); // Validate URL format
        setUris([...uris, currentUri]);
        setCurrentUri('');
      } catch (e) {
        alert('URL inválida');
      }
    }
  };

  const handleRemoveUri = (uriToRemove: string) => {
    setUris(uris.filter((uri) => uri !== uriToRemove));
  };

  const onSubmit = async (data: FormData) => {
    setError(null);

    if (uris.length === 0) {
      setError('Debes agregar al menos una Redirect URI');
      return;
    }

    const res = await registerApp({
      name: data.name,
      redirect_uris: uris,
      scopes: data.scopes || [],
    });

    if (res.success) {
      router.push(`/developer-portal/apps/${res.data.client_id}`);
    } else {
      setError(res.error || 'Error al registrar la aplicación');
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
        <label className="block text-sm font-medium text-slate-400 mb-1">
          Nombre de la Aplicación
        </label>
        <input
          {...register('name', { required: 'El nombre es obligatorio' })}
          placeholder="Mi ERP Integración"
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Redirect URIs</label>
        <div className="flex gap-2 mb-2">
          <input
            value={currentUri}
            onChange={(e) => setCurrentUri(e.target.value)}
            placeholder="https://mi-app.com/callback"
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // trigger add logic manually if needed or let button handle it
                // but since button is type submit by default inside form if not specified...
                // actually we made the add button onClick preventDefault.
              }
            }}
          />
          <button
            onClick={handleAddUri}
            type="button"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded border border-slate-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {uris.map((uri) => (
            <span
              key={uri}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 flex items-center gap-2"
            >
              {uri}
              <button
                type="button"
                onClick={() => handleRemoveUri(uri)}
                className="text-slate-500 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">Permisos (Scopes)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AVAILABLE_SCOPES.map((scope) => (
            <label
              key={scope.value}
              className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-600 transition-colors"
            >
              <input
                type="checkbox"
                value={scope.value}
                {...register('scopes')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300">{scope.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          Registrar Aplicación
        </button>
      </div>
    </form>
  );
}

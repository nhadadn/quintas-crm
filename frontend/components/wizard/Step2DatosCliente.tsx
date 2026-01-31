import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Cliente } from '@/types/erp';
import { searchClientes } from '@/lib/clientes-api';

interface Step2Props {
  onNext: (cliente: Cliente) => void;
  onBack: () => void;
  initialCliente: Cliente | null;
}

interface ClienteFormInputs {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  rfc: string;
  direccion: string;
  ciudad: string;
  estado: string;
  cp: string;
}

export function Step2DatosCliente({ onNext, onBack, initialCliente }: Step2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [searching, setSearching] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ClienteFormInputs>({
    defaultValues: initialCliente || {},
  });

  useEffect(() => {
    if (initialCliente) {
      reset(initialCliente);
    }
  }, [initialCliente, reset]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchClientes(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectCliente = (cliente: Cliente) => {
    reset(cliente);
    setSearchResults([]);
    setSearchQuery('');
  };

  const onSubmit = (data: ClienteFormInputs) => {
    // Aquí se podría guardar el cliente en el backend si es nuevo, 
    // o simplemente pasar los datos al siguiente paso.
    // Asumiremos que pasamos los datos y se crea/actualiza al final.
    const cliente: Cliente = {
      id: initialCliente?.id || '', // Si no tiene ID, es nuevo
      ...data,
    };
    onNext(cliente);
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Datos del Cliente</h2>
      
      {/* Buscador de Clientes */}
      <div className="mb-8 bg-slate-900 p-4 rounded-lg border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-2">Buscar Cliente Existente (Email o RFC)</label>
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ejemplo@email.com o RFC"
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
              {searchResults.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => selectCliente(cliente)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-0"
                >
                  <p className="font-semibold text-white">{cliente.nombre} {cliente.apellido_paterno}</p>
                  <p className="text-sm text-slate-400">{cliente.email} - {cliente.rfc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {searchResults.length === 0 && searchQuery && !searching && (
           <p className="text-xs text-slate-500 mt-2">Si no encuentras al cliente, llena el formulario para crear uno nuevo.</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
            <input
              {...register('nombre', { required: 'El nombre es obligatorio' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.nombre && <span className="text-red-500 text-xs mt-1">{errors.nombre.message}</span>}
          </div>

          {/* Apellido Paterno */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Apellido Paterno</label>
            <input
              {...register('apellido_paterno', { required: 'El apellido paterno es obligatorio' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.apellido_paterno && <span className="text-red-500 text-xs mt-1">{errors.apellido_paterno.message}</span>}
          </div>

          {/* Apellido Materno */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Apellido Materno</label>
            <input
              {...register('apellido_materno')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              {...register('email', { 
                required: 'El email es obligatorio',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email inválido"
                }
              })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono</label>
            <input
              {...register('telefono', { required: 'El teléfono es obligatorio' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.telefono && <span className="text-red-500 text-xs mt-1">{errors.telefono.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RFC */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">RFC</label>
            <input
              {...register('rfc', { 
                required: 'El RFC es obligatorio',
                pattern: {
                  value: /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/,
                  message: "Formato de RFC inválido"
                }
              })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.rfc && <span className="text-red-500 text-xs mt-1">{errors.rfc.message}</span>}
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Dirección</label>
          <input
            {...register('direccion', { required: 'La dirección es obligatoria' })}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {errors.direccion && <span className="text-red-500 text-xs mt-1">{errors.direccion.message}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ciudad */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ciudad</label>
            <input
              {...register('ciudad', { required: 'La ciudad es obligatoria' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.ciudad && <span className="text-red-500 text-xs mt-1">{errors.ciudad.message}</span>}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
            <input
              {...register('estado', { required: 'El estado es obligatorio' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.estado && <span className="text-red-500 text-xs mt-1">{errors.estado.message}</span>}
          </div>

          {/* CP */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Código Postal</label>
            <input
              {...register('cp', { required: 'El CP es obligatorio' })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.cp && <span className="text-red-500 text-xs mt-1">{errors.cp.message}</span>}
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-slate-700">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Atrás
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
          >
            Siguiente
          </button>
        </div>
      </form>
    </div>
  );
}

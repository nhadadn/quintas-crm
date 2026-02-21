'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Cliente } from '@/types/erp';
import { searchClientes, findClienteByEmailOrRFC } from '@/lib/clientes-api';

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
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [searching, setSearching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
      const results = await searchClientes(searchQuery, session?.accessToken);
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

  const onSubmit = async (data: ClienteFormInputs) => {
    setIsValidating(true);
    try {
      // 1. Si ya tenemos un ID válido (seleccionado previamente), continuamos
      if (initialCliente?.id && !String(initialCliente.id).startsWith('new_')) {
        onNext({ ...data, id: initialCliente.id });
        return;
      }

      // 2. Verificar si existe por Email, RFC o Teléfono
      const existingCliente = await findClienteByEmailOrRFC(
        data.email,
        data.rfc,
        data.telefono,
        session?.accessToken,
      );

      if (existingCliente) {
        // Cliente existe -> Preguntar si reutilizar
        const confirmReuse = window.confirm(
          `Ya existe un cliente registrado con estos datos similares:\n\n` +
            `Nombre: ${existingCliente.nombre} ${existingCliente.apellido_paterno}\n` +
            `RFC: ${existingCliente.rfc || 'N/A'}\n` +
            `Email: ${existingCliente.email}\n` +
            `Teléfono: ${existingCliente.telefono || 'N/A'}\n\n` +
            `¿Desea asignar la venta a este cliente existente?`,
        );

        if (confirmReuse) {
          // Usar el ID existente
          onNext({ ...data, id: existingCliente.id });
        } else {
          // Usuario rechazó reutilizar -> No podemos crear duplicado
          alert(
            'No es posible crear un cliente con Email o RFC duplicado.\nPor favor verifique los datos o use el cliente existente.',
          );
        }
      } else {
        // Cliente nuevo -> Proceder
        const cliente: Cliente = {
          id: '', // Se generará al finalizar
          ...data,
        };
        onNext(cliente);
      }
    } catch (error) {
      console.error('Error validando cliente:', error);
      alert('Error al validar datos del cliente. Intente nuevamente.');
    } finally {
      setIsValidating(false);
    }
  };

  return (

    <div className="max-w-4xl mx-auto bg-card p-8 rounded-2xl shadow-card border border-border">
      <h2 className="text-2xl font-semibold tracking-tight text-text-primary mb-6">
        Datos del Cliente
      </h2>

      {/* Buscador de Clientes */}
      <div className="mb-8 bg-background-paper p-4 rounded-2xl border border-border shadow-card">
        <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Buscar Cliente Existente (Email o RFC)
        </label>
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ejemplo@email.com o RFC"
            className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-xl border border-border bg-background text-foreground hover:bg-background-subtle transition-colors disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-card z-10 max-h-60 overflow-y-auto">
              {searchResults.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => selectCliente(cliente)}
                  className="w-full text-left px-4 py-3 hover:bg-background-subtle border-b border-border last:border-0"
                >
                  <p className="font-medium text-foreground">
                    {cliente.nombre} {cliente.apellido_paterno}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.email} - {cliente.rfc}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-xs text-muted-foreground mt-2">
            Si no encuentras al cliente, llena el formulario para crear uno nuevo.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Información Personal
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Nombre
              </label>
              <input
                {...register('nombre', { required: 'El nombre es obligatorio' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.nombre && (
                <span className="text-red-500 text-xs mt-1">{errors.nombre.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Apellido Paterno
              </label>
              <input
                {...register('apellido_paterno', { required: 'El apellido paterno es obligatorio' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.apellido_paterno && (
                <span className="text-red-500 text-xs mt-1">{errors.apellido_paterno.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Apellido Materno
              </label>
              <input
                {...register('apellido_materno')}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                RFC
              </label>
              <input
                {...register('rfc', {
                  required: 'El RFC es obligatorio',
                })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.rfc && <span className="text-red-500 text-xs mt-1">{errors.rfc.message}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Información de Contacto
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'El email es obligatorio',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.email && (
                <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Teléfono
              </label>
              <input
                {...register('telefono', { required: 'El teléfono es obligatorio' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.telefono && (
                <span className="text-red-500 text-xs mt-1">{errors.telefono.message}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Dirección
            </label>
            <input
              {...register('direccion', { required: 'La dirección es obligatoria' })}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
            {errors.direccion && (
              <span className="text-red-500 text-xs mt-1">{errors.direccion.message}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Ciudad
              </label>
              <input
                {...register('ciudad', { required: 'La ciudad es obligatoria' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.ciudad && (
                <span className="text-red-500 text-xs mt-1">{errors.ciudad.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Estado
              </label>
              <input
                {...register('estado', { required: 'El estado es obligatorio' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.estado && (
                <span className="text-red-500 text-xs mt-1">{errors.estado.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Código Postal
              </label>
              <input
                {...register('cp', { required: 'El CP es obligatorio' })}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
              />
              {errors.cp && <span className="text-red-500 text-xs mt-1">{errors.cp.message}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-border">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 rounded-xl border border-border bg-background text-muted-foreground hover:bg-background-subtle transition-colors"
          >
            Atrás
          </button>
          <button
            type="submit"
            disabled={isValidating}
            className={`px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark transition-colors ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isValidating ? 'Validando...' : 'Siguiente'}
          </button>
        </div>
      </form>
    </div>
  );
}

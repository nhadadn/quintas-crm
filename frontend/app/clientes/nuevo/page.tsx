'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createCliente } from '@/lib/clientes-api';
import { Cliente } from '@/types/erp';
import Link from 'next/link';

type FormData = Omit<Cliente, 'id' | 'date_created' | 'date_updated' | 'user_created' | 'user_updated'>;

export default function NuevoClientePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createCliente(data);
      router.push('/clientes');
    } catch (error) {
      console.error('Error creando cliente:', error);
      alert('Error al crear cliente. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/clientes" className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
          &larr; Volver a Clientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Nuevo Cliente</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre(s) *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="nombre"
                  {...register('nombre', { required: 'Este campo es obligatorio' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="apellido_paterno" className="block text-sm font-medium text-gray-700">
                Apellido Paterno *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="apellido_paterno"
                  {...register('apellido_paterno', { required: 'Este campo es obligatorio' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.apellido_paterno && (
                  <p className="mt-1 text-sm text-red-600">{errors.apellido_paterno.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="apellido_materno" className="block text-sm font-medium text-gray-700">
                Apellido Materno
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="apellido_materno"
                  {...register('apellido_materno')}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="rfc" className="block text-sm font-medium text-gray-700">
                RFC
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="rfc"
                  {...register('rfc')}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico *
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  {...register('email', { 
                    required: 'Este campo es obligatorio',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Dirección de correo inválida'
                    }
                  })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  id="telefono"
                  {...register('telefono', { required: 'Este campo es obligatorio' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
                Dirección Completa
              </label>
              <div className="mt-1">
                <textarea
                  id="direccion"
                  rows={3}
                  {...register('direccion')}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Link
              href="/clientes"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createVendedor } from '@/lib/vendedores-api';
import { Vendedor } from '@/types/erp';
import Link from 'next/link';

type FormData = Omit<Vendedor, 'id'>;

export default function NuevoVendedorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createVendedor(data);
      router.push('/vendedores');
    } catch (error) {
      console.error('Error creando vendedor:', error);
      alert('Error al crear vendedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/vendedores"
          className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
        >
          &larr; Volver a Vendedores
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Nuevo Vendedor</h1>
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
                      message: 'Dirección de correo inválida',
                    },
                  })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Link
              href="/vendedores"
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
              {isSubmitting ? 'Guardando...' : 'Guardar Vendedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

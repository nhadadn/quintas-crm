'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { getVendedorById, updateVendedor } from '@/lib/vendedores-api';
import { fetchComisionesByVendedor } from '@/lib/comisiones-api';
import { Vendedor, Comision } from '@/types/erp';
import Link from 'next/link';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DetalleVendedorPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'comisiones'>('info');
  const [isEditing, setIsEditing] = useState(false);

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Vendedor>();

  useEffect(() => {
    if (!id) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const vendedorData = await getVendedorById(id, session?.accessToken);
        setVendedor(vendedorData);
        reset(vendedorData);

        const comisionesData = await fetchComisionesByVendedor(id, session?.accessToken);
        setComisiones(comisionesData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, reset, session]);

  const onSubmit = async (data: Vendedor) => {
    try {
      const updatedVendedor = await updateVendedor(id, data, session?.accessToken);
      setVendedor(updatedVendedor);
      setIsEditing(false);
      alert('Vendedor actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando vendedor:', error);
      alert('Error al actualizar vendedor');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  if (loading) return <div className="p-6 text-center">Cargando...</div>;
  if (!vendedor) return <div className="p-6 text-center text-red-600">Vendedor no encontrado</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/vendedores"
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            &larr; Volver a Vendedores
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {vendedor.nombre} {vendedor.apellido_paterno}
          </h1>
          <p className="text-gray-500">ID: {vendedor.id}</p>
        </div>
        {!isEditing && activeTab === 'info' && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Editar Vendedor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Información General
          </button>
          <button
            onClick={() => setActiveTab('comisiones')}
            className={`${
              activeTab === 'comisiones'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Comisiones ({comisiones.length})
          </button>
        </nav>
      </div>

      {/* Contenido Info */}
      {activeTab === 'info' && (
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  {...register('nombre', { required: true })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Apellido Paterno</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  {...register('apellido_paterno', { required: true })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  disabled={!isEditing}
                  {...register('email', { required: true })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    reset(vendedor);
                  }}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Guardar Cambios
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Contenido Comisiones */}
      {activeTab === 'comisiones' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estatus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Programada
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comisiones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay comisiones registradas
                  </td>
                </tr>
              ) : (
                comisiones.map((comision) => (
                  <tr key={comision.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                      {comision.venta_id ? (
                        <Link
                          href={`/ventas/${typeof comision.venta_id === 'object' ? comision.venta_id.id : comision.venta_id}`}
                        >
                          {typeof comision.venta_id === 'object'
                            ? String(comision.venta_id.id).substring(0, 8)
                            : 'Ver Venta'}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Sin venta asignada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {comision.tipo_comision} ({comision.porcentaje}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(comision.monto_comision)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          comision.estatus === 'pagada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {comision.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(comision.fecha_pago_programada)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

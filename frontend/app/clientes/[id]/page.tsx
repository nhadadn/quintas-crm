'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { fetchClienteById, updateCliente } from '@/lib/clientes-api';
import { fetchVentasByClienteId } from '@/lib/ventas-api';
import { Cliente, Venta } from '@/types/erp';
import Link from 'next/link';
import { format } from 'date-fns';
import ModalCrearAcceso from '@/components/clientes/ModalCrearAcceso';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DetalleClientePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'ventas'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [showCrearAcceso, setShowCrearAcceso] = useState(false);

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Cliente>();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setLoading(false);
      return;
    }

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const clienteData = await fetchClienteById(id, session?.accessToken);
        setCliente(clienteData);
        reset(clienteData); // Inicializar formulario

        const ventasData = await fetchVentasByClienteId(id, session?.accessToken);
        setVentas(ventasData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, reset, status, session]);

  const onSubmit = async (data: Cliente) => {
    try {
      const updatedCliente = await updateCliente(id, data, session?.accessToken);
      setCliente(updatedCliente);
      setIsEditing(false);
      alert('Cliente actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      alert('Error al actualizar cliente');
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando...</div>;
  if (!cliente) return <div className="p-6 text-center text-red-600">Cliente no encontrado</div>;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/clientes"
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            &larr; Volver a Clientes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {cliente.nombre} {cliente.apellido_paterno}
          </h1>
          <p className="text-gray-500">Cliente desde: {formatDate(cliente.date_created)}</p>
        </div>
        {!isEditing && activeTab === 'info' && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Editar Cliente
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
            onClick={() => setActiveTab('ventas')}
            className={`${
              activeTab === 'ventas'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Historial de Compras ({ventas.length})
          </button>
        </nav>
      </div>

      {/* Contenido Info */}
      {activeTab === 'info' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Sección Acceso al Portal */}
          <div className="mb-6 p-4 border rounded-lg">
            {(cliente as any)?.user_id ? (
              <div className="flex items-center justify-between">
                <div className="text-emerald-700 font-medium">✓ Tiene acceso al portal</div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border text-sm text-gray-600 hover:bg-gray-50"
                  disabled
                  title="Pendiente"
                >
                  Restablecer contraseña
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-amber-700 font-medium">Sin acceso</div>
                <button
                  type="button"
                  onClick={() => setShowCrearAcceso(true)}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Crear credenciales de acceso
                </button>
              </div>
            )}
          </div>
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
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Apellido Materno</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  {...register('apellido_materno')}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">RFC</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  {...register('rfc')}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  disabled={!isEditing}
                  {...register('email', { required: true })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  {...register('telefono', { required: true })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border ${!isEditing ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                <textarea
                  rows={3}
                  disabled={!isEditing}
                  {...register('direccion')}
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
                    reset(cliente);
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
          <ModalCrearAcceso
            open={showCrearAcceso}
            onClose={() => setShowCrearAcceso(false)}
            cliente={{ id, email: cliente.email, nombre: cliente.nombre }}
            token={session?.accessToken}
            onSuccess={(userId) => {
              setCliente({ ...(cliente as any), user_id: userId } as any);
            }}
          />
        </div>
      )}

      {/* Contenido Ventas */}
      {activeTab === 'ventas' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estatus
                </th>
                <th className="px-6 py-3 relative">
                  <span className="sr-only">Ver</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay compras registradas
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {typeof venta.lote_id === 'object' ? venta.lote_id.identificador : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(venta.fecha_venta)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(venta.monto_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          venta.estatus === 'liquidado'
                            ? 'bg-green-100 text-green-800'
                            : venta.estatus === 'cancelada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {venta.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/ventas/${venta.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Ver Detalles
                      </Link>
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

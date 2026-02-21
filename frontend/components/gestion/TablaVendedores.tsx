'use client';

import React from 'react';
import { Vendedor } from '@/types/erp';
import Link from 'next/link';

interface TablaVendedoresProps {
  vendedores: Vendedor[];
  isLoading?: boolean;
  onVerDetalles: (id: string | number) => void;
}

const TablaVendedores: React.FC<TablaVendedoresProps> = ({
  vendedores,
  isLoading = false,
  onVerDetalles,
}) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nombre Completo
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ID Sistema
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Cargando vendedores...
                </td>
              </tr>
            ) : vendedores.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay vendedores registrados
                </td>
              </tr>
            ) : (
              vendedores.map((vendedor) => (
                <tr key={vendedor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vendedor.nombre} {vendedor.apellido_paterno}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vendedor.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-mono text-xs">{vendedor.id}</span>
                    <button
                      onClick={() => onVerDetalles(vendedor.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      className="text-indigo-600 hover:text-indigo-900"
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaVendedores;

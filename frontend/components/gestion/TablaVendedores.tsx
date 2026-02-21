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
    <div className="bg-card border border-border rounded-2xl overflow-hidden w-full shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-muted-foreground">
          <thead className="bg-background-paper text-foreground uppercase font-medium">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground"
              >
                Nombre Completo
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium tracking-widest text-muted-foreground"
              >
                ID Sistema
              </th>
              <th scope="col" className="relative px-6 py-4 text-right text-xs font-medium tracking-widest text-muted-foreground">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Cargando vendedores...
                </td>
              </tr>
            ) : vendedores.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No hay vendedores registrados
                </td>
              </tr>
            ) : (
              vendedores.map((vendedor) => (
                <tr key={vendedor.id} className="hover:bg-background-subtle transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {vendedor.nombre} {vendedor.apellido_paterno}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {vendedor.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-background-subtle px-2 py-1 rounded-full border border-border">
                      {vendedor.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onVerDetalles(vendedor.id)}
                      className="text-primary-light hover:text-primary transition-colors text-sm font-medium"
                    >
                      Ver Detalles
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

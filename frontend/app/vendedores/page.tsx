'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TablaVendedores from '@/components/gestion/TablaVendedores';
import { fetchVendedores } from '@/lib/vendedores-api';
import { Vendedor } from '@/types/erp';
import Link from 'next/link';

export default function GestionVendedoresPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVendedores();
  }, [session]);

  const cargarVendedores = async () => {
    setLoading(true);
    try {
      const data = await fetchVendedores(session?.accessToken);
      if (data) {
        setVendedores(data);
      }
    } catch (error) {
      console.error('Error cargando vendedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (id: string | number) => {
    router.push(`/vendedores/${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Gestión de Vendedores
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra el equipo de ventas y consulta sus comisiones.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/vendedores/nuevo"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-warm hover:bg-primary-dark hover:shadow-warm-hover focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
            >
              Nuevo Vendedor
            </Link>
          </div>
        </div>

        <TablaVendedores
          vendedores={vendedores}
          isLoading={loading}
          onVerDetalles={handleVerDetalles}
        />
      </div>
    </div>
  );
}

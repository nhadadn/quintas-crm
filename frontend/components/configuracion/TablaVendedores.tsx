'use client';

import React, { useMemo, useState } from 'react';
import ModalNuevoVendedor from './ModalNuevoVendedor';
import ModalCrearAccesoVendedor from './ModalCrearAccesoVendedor';
import { listVendedoresForConfig, updateVendedor } from '@/lib/vendedores-api';
import Link from 'next/link';

interface TablaVendedoresProps {
  initialVendedores: any[];
}

export default function TablaVendedores({ initialVendedores }: TablaVendedoresProps) {
  const [vendedores, setVendedores] = useState<any[]>(initialVendedores || []);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos');
  const [openNuevo, setOpenNuevo] = useState(false);
  const [crearAccesoPara, setCrearAccesoPara] = useState<null | { id: string; email: string }>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const getEstadoLabel = (estatus: any): 'Activo' | 'Inactivo' => {
    if (typeof estatus === 'string') {
      const val = estatus.toLowerCase();
      return val === 'activo' || val === '1' || val === 'true' ? 'Activo' : 'Inactivo';
    }
    return estatus ? 'Activo' : 'Inactivo';
  };

  const filtrados = useMemo(() => {
    if (filtroEstado === 'Todos') return vendedores;
    return vendedores.filter((v) => getEstadoLabel(v.estatus) === filtroEstado);
  }, [vendedores, filtroEstado]);

  const reload = async () => {
    setLoading(true);
    try {
      const nuevos = await listVendedoresForConfig();
      setVendedores(nuevos);
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (id: string) => {
    const prev = vendedores.slice();
    setVendedores((list) => list.map((v) => (String(v.id) === String(id) ? { ...v, estatus: 0 } : v)));
    try {
      await updateVendedor(id, { estatus: 0 } as any);
    } catch {
      setVendedores(prev);
      alert('Error al desactivar vendedor');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Estado</label>
          <select
            className="px-3 py-2 rounded-xl border border-border bg-background"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
          >
            <option>Todos</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
        </div>
        <button
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark"
          onClick={() => setOpenNuevo(true)}
        >
          + Nuevo Vendedor
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-paper">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nombre completo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acceso
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filtrados.map((v) => {
              const nombreCompleto = [v.nombre, v.apellido_paterno, v.apellido_materno]
                .filter(Boolean)
                .join(' ');
              const tieneCuenta = !!v.user_id;
              return (
                <tr key={v.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {nombreCompleto}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {v.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {v.telefono || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(() => {
                      const label = getEstadoLabel(v.estatus);
                      return (
                        <span
                          className={
                            label === 'Activo' ? 'text-success font-medium' : 'text-danger font-medium'
                          }
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {tieneCuenta ? (
                      <span className="text-success font-medium">✓ Tiene cuenta</span>
                    ) : (
                      <span className="text-danger font-medium">✗ Sin cuenta</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/vendedores/${v.id}`}
                        className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-background-subtle"
                      >
                        Ver perfil
                      </Link>
                      {tieneCuenta ? null : (
                        <button
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark"
                          onClick={() => setCrearAccesoPara({ id: String(v.id), email: v.email })}
                        >
                          Crear acceso
                        </button>
                      )}
                      {(v.estatus || 'Activo') === 'Activo' ? (
                        <button
                          className="px-3 py-1.5 rounded-xl border border-border text-danger hover:bg-background-subtle"
                          onClick={() => desactivar(String(v.id))}
                        >
                          Desactivar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-center text-muted-foreground text-sm" colSpan={6}>
                  {loading ? 'Cargando…' : 'Sin vendedores para mostrar'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openNuevo && (
        <ModalNuevoVendedor
          open={openNuevo}
          onClose={() => setOpenNuevo(false)}
          onSuccess={async () => {
            setOpenNuevo(false);
            await reload();
          }}
        />
      )}

      {crearAccesoPara && (
        <ModalCrearAccesoVendedor
          open={!!crearAccesoPara}
          onClose={() => setCrearAccesoPara(null)}
          vendedor={crearAccesoPara}
          onSuccess={async () => {
            setCrearAccesoPara(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}
